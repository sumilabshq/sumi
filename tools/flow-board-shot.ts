import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

const REPO = path.resolve(import.meta.dirname, "..");
const out = process.argv[2] ?? "/tmp/flow-board";
const SIZE: readonly [number, number] = [1000, 640];
const SHEETS = [
	...BROWSER_SHEET_SOURCES,
	"apps/studio/src/features/frame/shell.css",
	"plugins/tabs/flow-strip/src/features/pane-tabs/ui/pane-tab-row/pane-tab-row.css",
	"plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.css",
	"plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.css",
];
const DEMO_SHEET = `
.demo-frame { width: 1000px; height: 640px; }
.demo-title { display: flex; flex: none; align-items: center; height: var(--header-h); padding-left: 248px; }
.demo-sidebar { flex: none; width: 240px; }
.demo-zone { padding: 0 8px 8px 0; }
.demo-page { padding: 16px; font: var(--fw-ui) var(--fs-13) / 1.5 var(--font-ui); color: var(--text); }
`;

mkdirSync(out, { recursive: true });
const bundled = await bundleOf("tools/flow-board-page.tsx");
const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
let failures = 0;

function check(name: string, got: unknown, want: unknown): void {
	const isOk = JSON.stringify(got) === JSON.stringify(want);
	failures += isOk ? 0 : 1;
	console.log(
		`${isOk ? "OK " : "BAD"} ${name}${isOk ? "" : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`,
	);
}

function htmlOf(theme: string): string {
	const dark = theme === "dark" ? " dark" : "";
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}${DEMO_SHEET}</style></head><body class="theme-${theme}${dark}" style="margin:0;background:var(--frame)"><div id="demo"></div><script>${bundled.replaceAll("</script", "<\\/script")}</script></body></html>`;
}

async function opened(theme: string, scenario: string): Promise<{ page: AskedPage; stop: () => void }> {
	const html = htmlOf(theme);
	const server = http.createServer((_request, reply) => {
		reply.setHeader("content-type", "text/html");
		reply.end(html);
	});
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/#${scenario}`, "flow board", { size: SIZE, hearsFailures: true });
	await waited(1800);
	return {
		page,
		stop: () => {
			page.close();
			server.close();
		},
	};
}

async function shot(page: AskedPage, name: string): Promise<void> {
	writeFileSync(path.join(out, `${name}.png`), await page.shoot());
}

async function asked<T>(page: AskedPage, expression: string): Promise<T> {
	return JSON.parse(String(await page.ask(`(async () => JSON.stringify(await (${expression})))()`))) as T;
}

interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

async function boxOf(page: AskedPage, selector: string): Promise<Box> {
	return asked<Box>(
		page,
		`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
	);
}

const centre = (box: Box): readonly [number, number] => [box.x + box.width / 2, box.y + box.height / 2];

async function panesOf(page: AskedPage): Promise<readonly (readonly string[])[]> {
	return asked(
		page,
		"window.__demo.layout().then((layout) => { const out = []; const walk = (n) => n.kind === 'pane' ? out.push(n.tabIds) : n.children.forEach(walk); walk(layout.root); return out; })",
	);
}

async function rowsOf(page: AskedPage): Promise<readonly (readonly string[])[]> {
	return asked(
		page,
		"[...document.querySelectorAll('[data-flow-pane-row]')].map((row) => [...row.querySelectorAll('[data-flow-tab]')].map((tab) => tab.getAttribute('data-flow-tab') + (tab.getAttribute('data-mode') === 'icon' ? ':icon' : '')))",
	);
}

async function lookShots(): Promise<void> {
	for (const theme of ["light", "dark"]) {
		for (const scenario of ["side", "stacked", "narrow"]) {
			const { page, stop } = await opened(theme, scenario);
			await shot(page, `${scenario}-${theme}`);
			console.log(
				`shot ${scenario}-${theme} rows`,
				JSON.stringify(await rowsOf(page)),
				"failures",
				page.failures().length,
			);
			stop();
		}
	}
}

async function behaviourChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	check("side by side: two rows, one per pane", (await rowsOf(page)).length, 2);
	check(
		"the header holds both rows",
		await asked(page, "document.querySelectorAll('.sumi-flow-strip [data-flow-pane-row]').length"),
		2,
	);
	check(
		"the board draws no row of its own",
		await asked(page, "document.querySelectorAll('.sumi-flow-board [data-flow-pane-row]').length"),
		0,
	);
	const before = await asked<Record<string, number>>(page, "window.__demo.mounts");
	const second = await boxOf(page, "[data-flow-tab='sub-3-1']");
	await page.press(...centre(second));
	await page.release(centre(second));
	await waited(500);
	check(
		"a click shows the tab",
		await asked(page, "document.querySelector(\"[data-flow-tab='sub-3-1']\").getAttribute('aria-selected')"),
		"true",
	);
	check("switching tabs mounts nothing again", await asked(page, "window.__demo.mounts"), {
		...before,
		"page sub-3-1": 1,
	});
	await page.press(...centre(await boxOf(page, "[data-flow-tab='chat-03']")));
	await page.release(centre(await boxOf(page, "[data-flow-tab='chat-03']")));
	await waited(400);
	check("switching back keeps the chat mounted once", await asked(page, "window.__demo.mounts['chat chat-03']"), 1);
	await page.ask(
		"document.querySelector(\"[data-flow-tab='sub-3-1']\").dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 330, clientY: 20 }))",
	);
	await waited(500);
	await shot(page, "menu-light");
	check(
		"the tab menu lists its items",
		await asked(page, "[...document.querySelectorAll('[role=menuitem]')].map((item) => item.textContent)"),
		["Rename", "Duplicate", "Split right", "Split down", "Save as setup", "Close"],
	);
	stop();
}

async function renameChecks(): Promise<void> {
	const field = "document.querySelector(\"input[aria-label='Tab name']\")";
	const typed = async (key: "Escape" | "Enter"): Promise<unknown> => {
		const { page, stop } = await opened("light", "rename");
		await page.typeText("Renamed");

		if (key === "Enter") {
			await page.pressEnter();
		} else {
			await page.ask(`${field}.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
		}

		await page.ask(`${field}.blur()`);
		await waited(200);
		const renames = await asked(page, "window.__renames");
		stop();
		return renames;
	};
	check("Escape never commits, even when the field then blurs", await typed("Escape"), [null]);
	check("Enter commits once, even when the field then blurs", await typed("Enter"), ["Renamed"]);
}

async function keyboardChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	await page.ask(
		"document.querySelector(\"[data-flow-tab='sub-3-1']\").dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 0, clientY: 0 }))",
	);
	await waited(500);
	const menu = await asked<{ x: number }>(
		page,
		"(() => { const r = document.querySelector('[role=menu]').getBoundingClientRect(); return { x: r.x }; })()",
	);
	check("a keyboard-opened tab menu opens at the tab, not the corner", menu.x > 100, true);
	stop();
	await arrowChecks();
}

async function arrowChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	const row = "[data-flow-pane-row='pane-3']";
	const key = (name: string): string =>
		`document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "${name}", bubbles: true, cancelable: true }))`;
	const focused = "document.activeElement.getAttribute('data-flow-tab')";
	await page.ask(`document.querySelector("${row} [role=tab][tabindex='0']").focus()`);
	const first = await asked(page, focused);
	await page.ask(key("ArrowRight"));
	check("the arrow keys move focus along the tabs", (await asked(page, focused)) !== first, true);
	await page.ask(key("ArrowLeft"));
	check("and back again", await asked(page, focused), first);
	check(
		"only the shown tab is a tab stop",
		await asked(page, `document.querySelectorAll("${row} [role=tab][tabindex='0']").length`),
		1,
	);
	stop();
}

async function dragChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	const tab = await boxOf(page, "[data-flow-tab='sub-3-3']");
	const body = await boxOf(page, "[data-flow-pane-body='pane-31']");
	const edge: readonly [number, number] = [body.x + body.width - 12, body.y + body.height / 2];
	const held = await page.lift({ from: centre(tab), to: edge, steps: 12, stepMs: 20 });
	await waited(300);
	await shot(page, "drag-edge-light");
	await held.drop(edge);
	await waited(700);
	check("a drop on a pane edge splits it", await panesOf(page), [["chat-03", "sub-3-1"], ["sub-3-2"], ["sub-3-3"]]);
	const lifted = await boxOf(page, "[data-flow-tab='sub-3-1']");
	const target = await boxOf(page, "[data-flow-pane-row='pane-31'] [data-flow-tab='sub-3-2']");
	const move: readonly [number, number] = [target.x + 4, target.y + target.height / 2];
	const hold = await page.lift({ from: centre(lifted), to: move, steps: 12, stepMs: 20 });
	await waited(200);
	await shot(page, "drag-row-light");
	await hold.drop(move);
	await waited(700);
	check("a drop into another row moves the tab there, before the one aimed at", (await panesOf(page)).flat(), [
		"chat-03",
		"sub-3-1",
		"sub-3-2",
		"sub-3-3",
	]);
	check("sub-3-1 now stands in the middle pane", (await panesOf(page))[1], ["sub-3-1", "sub-3-2"]);
	check("the moved page was not mounted again", await asked(page, "window.__demo.mounts['page sub-3-1'] ?? 0"), 1);
	stop();
}

async function closeChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	const only = await boxOf(page, "[data-flow-pane-row='pane-31'] [data-flow-tab='sub-3-2']");
	await page.hover(...centre(only));
	await waited(200);
	const close = await boxOf(page, "[data-flow-pane-row='pane-31'] .sumi-pane-tab-close");
	await page.press(...centre(close));
	await page.release(centre(close));
	await waited(700);
	check("closing the last tab of a pane collapses it", await panesOf(page), [["chat-03", "sub-3-1", "sub-3-3"]]);
	check("one row is left", (await rowsOf(page)).length, 1);
	stop();
}

async function holdChecks(): Promise<void> {
	const { page, stop } = await opened("light", "held");
	const plus = await boxOf(page, "[data-flow-pane-row='pane-3'] button[aria-label='New tab']");
	await page.press(...centre(plus));
	await page.release(centre(plus));
	await waited(700);
	await shot(page, "refused-light");
	check(
		"a pane command from the other window shows its refusal",
		await asked(
			page,
			"[...document.querySelectorAll('[role=status]')].some((note) => note.textContent.includes('only that window changes its panes'))",
		),
		true,
	);
	stop();
}

async function plusChecks(): Promise<void> {
	const { page, stop } = await opened("light", "side");
	const plus = await boxOf(page, "[data-flow-pane-row='pane-31'] button[aria-label='New tab']");
	await page.press(...centre(plus));
	await page.release(centre(plus));
	await waited(900);
	check("plus adds a tab to that pane", (await panesOf(page))[1]?.length, 2);
	stop();
}

await lookShots();
await behaviourChecks();
await renameChecks();
await keyboardChecks();
await dragChecks();
await closeChecks();
await plusChecks();
await holdChecks();
console.log(failures === 0 ? "ALL OK" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
