import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

const REPO = path.resolve(import.meta.dirname, "..");
const out = process.argv[2] ?? "/tmp/flows-home";
const SIZE: readonly [number, number] = [1440, 900];
const HOME_SHEETS = [
	"features/home/ui/flows-home/flows-home.css",
	"features/home/ui/edit-toggle/edit-toggle.css",
	"features/launcher/ui/launcher-field/launcher-field.css",
	"features/setups/ui/setup-tiles/setup-tiles.css",
	"features/setups/ui/setup-thumb/setup-thumb.css",
	"features/apps/ui/app-tiles/app-tiles.css",
	"features/continue/ui/continue-rows/continue-rows.css",
	"shared/ui/tile-chrome/tile-chrome.css",
	"shared/ui/app-icon/app-icon.css",
	"shared/ui/home-section/home-section.css",
].map((at) => `plugins/tabs/flows-home/src/${at}`);
const SHEETS = [
	"design-systems/sumi/sumi.css",
	...BROWSER_SHEET_SOURCES,
	"apps/studio/src/features/frame/shell.css",
	"plugins/sumi-host/src/features/mascot/ui/sumi-figure/sumi-figure.css",
	"plugins/tabs/flows-sidebar/src/features/flows-column/ui/flows-sidebar/flows-sidebar.css",
	"plugins/tabs/flow-strip/src/features/pane-tabs/ui/pane-tab-row/pane-tab-row.css",
	"plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.css",
	"plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.css",
	...HOME_SHEETS,
];
const DEMO_SHEET = `
.demo-frame { width: 1440px; height: 900px; }
.demo-title { display: flex; flex: none; align-items: center; height: var(--header-h); padding-left: 248px; }
.demo-sidebar { flex: none; width: 248px; }
.demo-zone { padding: 0 8px 8px 0; }
.demo-page { padding: 16px; font: var(--fw-ui) var(--fs-13) / 1.5 var(--font-ui); color: var(--text); }
`;

mkdirSync(out, { recursive: true });
const bundled = await bundleOf("tools/flows-home-page.tsx");
const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
let failures = 0;

function check(name: string, got: unknown, want: unknown): void {
	const isOk = JSON.stringify(got) === JSON.stringify(want);
	failures += isOk ? 0 : 1;
	console.log(`${isOk ? "OK " : "BAD"} ${name}${isOk ? "" : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
}

function htmlOf(theme: string): string {
	const dark = theme === "dark" ? " dark" : "";
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}${DEMO_SHEET}</style></head><body class="theme-${theme}${dark}" style="margin:0;background:var(--frame)"><div id="demo"></div><script>${bundled.replaceAll("</script", "<\\/script")}</script></body></html>`;
}

async function opened(theme: string): Promise<{ page: AskedPage; stop: () => void }> {
	const html = htmlOf(theme);
	const server = http.createServer((_request, reply) => {
		reply.setHeader("content-type", "text/html");
		reply.end(html);
	});
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/`, "flows home", { size: SIZE, hearsFailures: true });
	await waited(2500);
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
	return asked<Box>(page, `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
}

const centre = (box: Box): readonly [number, number] => [box.x + box.width / 2, box.y + box.height / 2];

async function click(page: AskedPage, selector: string): Promise<void> {
	const at = centre(await boxOf(page, selector));
	await page.press(...at);
	await page.release(at);
	await waited(600);
}

const textsOf = (page: AskedPage, selector: string): Promise<readonly string[]> =>
	asked(page, `[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.textContent.trim())`);

const idsOf = (page: AskedPage, selector: string): Promise<readonly string[]> =>
	asked(page, `[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.getAttribute('data-tile-id'))`);

const styleOf = (page: AskedPage, selector: string, props: readonly string[]): Promise<Record<string, string>> =>
	asked(page, `(() => { const s = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return Object.fromEntries(${JSON.stringify(props)}.map((p) => [p, s.getPropertyValue(p)])); })()`);

async function typed(page: AskedPage, text: string): Promise<string> {
	await page.ask("document.querySelector('.sumi-home-input').focus()");
	await page.typeText(text);
	await waited(900);
	return (await textsOf(page, ".sumi-home-outcome"))[0] ?? "";
}

async function lookShots(): Promise<void> {
	for (const theme of ["light", "dark"]) {
		const { page, stop } = await opened(theme);
		await shot(page, `home-${theme}`);
		await click(page, ".sumi-home-edit");
		await shot(page, `edit-${theme}`);
		console.log(`shot ${theme} failures`, page.failures().length);
		stop();
	}
}

async function structureChecks(): Promise<void> {
	const { page, stop } = await opened("light");
	check("the empty sole pane draws Home, not the old new-tab page", await textsOf(page, ".sumi-home-question"), ["Where to?"]);
	check("the page plate holds the Home", await asked(page, "!!document.querySelector('.sumi-flow-page[data-active] > .wg-shell-plate.sumi-home')"), true);
	check("the old new-tab page is not drawn", await asked(page, "document.getElementById('demo').textContent.includes('old new-tab page')"), false);
	check("setups come from setups.all", (await textsOf(page, ".sumi-home-setup-name")).length, 4);
	check("setups are named by the saved setup", await textsOf(page, ".sumi-home-setup-name"), ["Chat and canvas", "Chat and browser", "Chat and terminal", "Code review"]);
	check("there is no New setup tile", await asked(page, "document.getElementById('demo').textContent.includes('New setup')"), false);
	check("continue lists three recent flows, not the open one", (await textsOf(page, ".sumi-home-continue-row")).length, 3);
	check("the three newest lead the list", (await textsOf(page, ".sumi-home-continue-age")).slice(0, 3), ["now", "2h", "1d"]);
	check("the field carries the hints", await textsOf(page, ".sumi-home-hints > span"), ["?Ask", "/Commands"]);
	const cell = await styleOf(page, ".sumi-home-cell", ["background-color", "border-top-width", "box-shadow"]);
	check("a setup tile is grey with no border and no shadow", [cell["background-color"] !== "rgba(0, 0, 0, 0)", cell["border-top-width"], cell["box-shadow"]], [true, "0px", "none"]);
	const app = await styleOf(page, ".sumi-home-app", ["background-color", "border-top-width", "box-shadow"]);
	check("an app tile has no background, border or shadow", [app["background-color"], app["border-top-width"], app["box-shadow"]], ["rgba(0, 0, 0, 0)", "0px", "none"]);
	const row = await styleOf(page, ".sumi-home-continue-row", ["font-size", "font-weight", "font-family"]);
	check("text is Inter 12.5 at weight 400", [row["font-size"], row["font-weight"], row["font-family"]?.startsWith("Inter")], ["12.5px", "400", true]);
	check("a page failure was not heard", page.failures().length, 0);
	stop();
}

async function launcherChecks(): Promise<void> {
	const cases: readonly (readonly [string, string])[] = [
		["terminal", "Open TerminalApp"],
		["github.com", "Open github.comAddress"],
		["best mechanical keyboard", "Search the webNo match"],
		["?why is the build failing", "Ask SumiAI"],
		["/new flow", "New flowCommand"],
	];

	for (const [text, want] of cases) {
		const { page, stop } = await opened("light");
		check(`typing "${text}" says what Enter does`, await typed(page, text), want);
		stop();
	}
}

async function launcherEffects(): Promise<void> {
	const app = await opened("light");
	await typed(app.page, "terminal");
	await app.page.pressEnter();
	await waited(900);
	const layout = await asked<{ root: { tabIds: string[] } }>(app.page, "window.__home.layout()");
	check("Enter on an app name opens it in the empty pane through flows.openTab", layout.root.tabIds.length, 1);
	check("the opened tab is no longer Home", await asked(app.page, "!!document.querySelector('.sumi-home')"), false);
	app.stop();

	const flow = await opened("light");
	const before = await asked<Record<string, string>>(flow.page, "window.__home.flowsOpened()");
	await typed(flow.page, "/new flow");
	await flow.page.pressEnter();
	await waited(900);
	const after = await asked<Record<string, string>>(flow.page, "window.__home.flowsOpened()");
	check("/new flow opens a different Flow", Object.values(after)[0] !== Object.values(before)[0], true);
	flow.stop();

	const address = await opened("light");
	await typed(address.page, "github.com");
	await address.page.pressEnter();
	await waited(900);
	console.log("address launch page calls:", JSON.stringify(await asked(address.page, "window.__home.pageCalls")));
	address.stop();
}

async function tileEffects(): Promise<void> {
	const setup = await opened("light");
	const before = await asked<Record<string, string>>(setup.page, "window.__home.flowsOpened()");
	await click(setup.page, ".sumi-home-setup");
	const after = await asked<Record<string, string>>(setup.page, "window.__home.flowsOpened()");
	check("a Setup tile starts a Flow and opens it", Object.values(after)[0] !== Object.values(before)[0], true);
	setup.stop();

	const app = await opened("light");
	await click(app.page, ".sumi-home-app");
	const layout = await asked<{ root: { tabIds: string[] } }>(app.page, "window.__home.layout()");
	check("an App tile opens that app in the pane", layout.root.tabIds.length, 1);
	app.stop();

	const recent = await opened("light");
	await click(recent.page, ".sumi-home-continue-row");
	check("a Continue row opens that Flow", Object.values(await asked<Record<string, string>>(recent.page, "window.__home.flowsOpened()"))[0], "flow-chat-chat-03");
	recent.stop();

	const more = await opened("light");
	await click(more.page, ".sumi-home-more");
	check("Show more lists more Flows and goes away", [(await textsOf(more.page, ".sumi-home-continue-row")).length > 3, await asked(more.page, "!!document.querySelector('.sumi-home-more')")], [true, false]);
	more.stop();
}

async function editChecks(): Promise<void> {
	const { page, stop } = await opened("light");
	check("the pencil sits alone in the top right", await textsOf(page, ".sumi-home-edit"), [""]);
	await click(page, ".sumi-home-edit");
	check("the pencil becomes Done", await textsOf(page, ".sumi-home-edit"), ["Done"]);
	const remove = await styleOf(page, ".sumi-home-remove", ["border-top-width", "background-color", "box-shadow"]);
	check("the remove cross has no outline and no resting background", [remove["border-top-width"], remove["background-color"], remove["box-shadow"]], ["0px", "rgba(0, 0, 0, 0)", "none"]);
	const cross = centre(await boxOf(page, ".sumi-home-apps .sumi-home-remove"));
	await page.hover(...cross);
	await waited(300);
	check("the cross shows a ghost background on hover", (await styleOf(page, ".sumi-home-apps .sumi-home-remove", ["background-color"]))["background-color"] !== "rgba(0, 0, 0, 0)", true);
	check("tiles do not launch while editing", await asked(page, "document.querySelector('.sumi-home-app').disabled"), true);

	const setupIds = await idsOf(page, ".sumi-home-setups [data-tile-id]");
	const grip = centre(await boxOf(page, `[data-tile-id='${setupIds[0]}'] .sumi-home-grip`));
	const target = centre(await boxOf(page, `[data-tile-id='${setupIds[2]}']`));
	const held = await page.lift({ from: grip, to: target, steps: 12, stepMs: 20 });
	await held.drop(target);
	await waited(800);
	const sorted = await idsOf(page, ".sumi-home-setups [data-tile-id]");
	check("dragging a Setup tile reorders it", sorted, [setupIds[1], setupIds[2], setupIds[0], setupIds[3]]);
	const kept = await asked<{ setupIds: string[] }>(page, "window.__home.arrangement()");
	check("the order is persisted by the home-layout module", kept.setupIds, sorted);

	const appIds = await idsOf(page, ".sumi-home-apps [data-tile-id]");
	const corner = centre(await boxOf(page, `[data-tile-id='${appIds[0]}'] .sumi-home-resize`));
	const column = (await boxOf(page, ".sumi-home-apps")).width / 6;
	const pulled = await page.lift({ from: corner, to: [corner[0] + column, corner[1]], steps: 8, stepMs: 20 });
	await pulled.drop([corner[0] + column, corner[1]]);
	await waited(800);
	const resized = await asked<{ apps: { app: string; span: number }[] }>(page, "window.__home.arrangement()");
	check("pulling an App corner resizes it and persists the size", resized.apps.find(({ app }) => app === appIds[0])?.span, 2);

	await click(page, `[data-tile-id='${appIds[1]}'] .sumi-home-remove`);
	const gone = await asked<{ hiddenApps: string[] }>(page, "window.__home.arrangement()");
	check("removing an App tile hides it and persists", [gone.hiddenApps, (await idsOf(page, ".sumi-home-apps [data-tile-id]")).includes(appIds[1] ?? "")], [[appIds[1]], false]);

	await click(page, `[data-tile-id='${sorted[3]}'] .sumi-home-remove`);
	check("removing a Setup tile removes the Setup", (await asked<unknown[]>(page, "window.__home.setups().then((read) => read.setups)")).length, 3);
	await shot(page, "edit-after");

	await click(page, ".sumi-home-edit");
	check("Done leaves edit mode", await textsOf(page, ".sumi-home-edit"), [""]);
	check("a page failure was not heard", page.failures().length, 0);
	stop();
}

await lookShots();
await structureChecks();
await launcherChecks();
await launcherEffects();
await tileEffects();
await editChecks();
console.log(failures === 0 ? "ALL OK" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
