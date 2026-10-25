import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { canvasSheet, withCanvasSheet } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";

const SIZE: readonly [number, number] = [1900, 1000];
const SETTLED_MS = 500;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-pane-states"));
mkdirSync(shotsAt, { recursive: true });

const [bundle, canvas] = await Promise.all([bundleOf("tools/studio-render-page.tsx"), canvasSheet(process.cwd())]);
const sheets = [
	readFileSync("design-systems/sumi/sumi.css", "utf8"),
	readFileSync("packages/shared/core/browser-host.css", "utf8"),
	withCanvasSheet(readFileSync("apps/host-obsidian/styles.css", "utf8"), canvas),
].join("\n");
const PAGE = `<!doctype html><html class="theme-dark dark"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = "studio-tauri";</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const PaneSchema = z.object({
	id: z.string(),
	view: z.string(),
	box: z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() }),
	isDimmed: z.boolean(),
	isMoving: z.boolean(),
	crumb: z.string(),
	tabId: z.string(),
});
const PANES = `[...document.querySelectorAll(".wg-pane")].map((pane) => { const box = pane.getBoundingClientRect(); return { id: pane.dataset.paneId, view: pane.dataset.paneView, box: { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) }, isDimmed: pane.hasAttribute("data-pane-dimmed"), isMoving: pane.hasAttribute("data-pane-moving"), crumb: (pane.querySelector(".wg-plate-head")?.textContent ?? "").trim(), tabId: pane.querySelector("[data-held-tab]")?.dataset.heldTab ?? "" }; })`;

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — saw ${JSON.stringify(got)}`}`);
}

async function panesOf(page: AskedPage): Promise<z.infer<typeof PaneSchema>[]> {
	return z.array(PaneSchema).parse(await page.ask(PANES));
}

async function shot(page: AskedPage, name: string): Promise<void> {
	writeFileSync(path.join(shotsAt, name), await page.shoot());
}

async function until(page: AskedPage, expression: string): Promise<boolean> {
	for (let tries = 0; tries < 40; tries += 1) {
		if ((await page.ask(expression)) === true) {
			return true;
		}

		await waited(100);
	}

	return false;
}

function centreOf(box: { left: number; top: number; width: number; height: number }): PagePoint {
	return [box.left + box.width / 2, box.top + box.height / 2];
}

type Pane = z.infer<typeof PaneSchema>;

const PREVIEW_ON_TOP = `(() => {
	const preview = document.querySelector(".wg-pane-preview");
	if (preview === null) return null;
	const box = preview.getBoundingClientRect();
	preview.style.pointerEvents = "auto";
	const spots = [[box.left + box.width / 2, box.top + 20], [box.left + box.width / 2, box.top + box.height / 2], [box.left + box.width / 2, box.bottom - 20]];
	const onTop = spots.every(([x, y]) => document.elementFromPoint(x, y) === preview);
	preview.style.pointerEvents = "";
	return { onTop, box: { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) } };
})()`;
const PreviewSchema = z.object({
	onTop: z.boolean(),
	box: z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() }),
});

async function placed(page: AskedPage, view: object, targetId: string, side: string): Promise<Pane> {
	const before = await panesOf(page);
	await page.ask(
		`window.__PLACE_PANE__(${JSON.stringify(view)}, ${JSON.stringify(targetId)}, ${JSON.stringify(side)})`,
	);
	await waited(SETTLED_MS);
	const fresh = (await panesOf(page)).find((pane) => !before.some((was) => was.id === pane.id));

	if (fresh === undefined) {
		throw new Error(`no pane appeared for ${JSON.stringify(view)}`);
	}

	return fresh;
}

async function paneById(page: AskedPage, id: string): Promise<Pane> {
	const pane = (await panesOf(page)).find((one) => one.id === id);

	if (pane === undefined) {
		throw new Error(`no pane ${id}`);
	}

	return pane;
}

async function rowCentre(page: AskedPage, selector: string): Promise<PagePoint> {
	const at = z
		.tuple([z.number(), z.number()])
		.parse(
			await page.ask(
				`(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
			),
		);
	return at;
}

function emptySpotOf(pane: Pane): PagePoint {
	return [pane.box.left + 10, pane.box.top + pane.box.height / 2];
}

function isNear(one: number, other: number): boolean {
	return Math.abs(one - other) <= 2;
}

async function checksBlueOverAnotherPane(page: AskedPage, tab8: Pane): Promise<void> {
	const from = await rowCentre(page, '[data-tabs-item=tab][data-tabs-id="tab-10"]');
	const drag = await page.lift({ from, to: centreOf(tab8.box), steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const preview = PreviewSchema.nullable().parse(await page.ask(PREVIEW_ON_TOP));
	await shot(page, "1-tab-carried-over-another-pane.png");
	check(
		"1. a tab carried over another pane opens a blue zone where it will land, drawn on top",
		preview?.onTop === true,
		preview,
	);
	await drag.drop(from);
	await waited(SETTLED_MS);
}

async function checksBlueOverOwnPane(page: AskedPage, tab10: Pane): Promise<void> {
	const from = await rowCentre(page, '[data-tabs-item=tab][data-tabs-id="tab-10"]');
	const drag = await page.lift({ from, to: centreOf(tab10.box), steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const preview = PreviewSchema.nullable().parse(await page.ask(PREVIEW_ON_TOP));
	const moving = await paneById(page, tab10.id);
	await shot(page, "2-tab-carried-over-its-own-pane.png");
	check(
		"2. a tab carried over its own pane: that pane hides and the blue zone covers exactly its place",
		moving.isMoving &&
			preview?.onTop === true &&
			isNear(preview.box.left, tab10.box.left) &&
			isNear(preview.box.width, tab10.box.width),
		[moving, preview],
	);
	const before = await panesOf(page);
	await drag.drop(centreOf(tab10.box));
	await waited(SETTLED_MS);
	const after = await panesOf(page);
	check(
		"2. dropped on its own place, no pane moves or changes width",
		JSON.stringify(after.map((pane) => [pane.id, pane.box])) ===
			JSON.stringify(before.map((pane) => [pane.id, pane.box])) && after.every((pane) => !pane.isMoving),
		after,
	);
}

async function checksPressInPage(page: AskedPage, tab8: Pane, tab10: Pane): Promise<void> {
	const area = z
		.tuple([z.number(), z.number()])
		.parse(
			await page.ask(
				`(() => { const box = document.querySelector('[data-pane-id="${tab8.id}"] [data-browser-page-area]').getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
			),
		);
	await page.press(...area);
	await waited(SETTLED_MS);
	const [first, second] = [await paneById(page, tab8.id), await paneById(page, tab10.id)];
	await shot(page, "3-press-inside-a-page-focuses-its-pane.png");
	check("3. a press inside a browser page focuses that pane and quiets the other", !first.isDimmed && second.isDimmed, [
		first,
		second,
	]);
}

async function checksSidebarFocusesOpenTab(page: AskedPage, tab8: Pane, tab10: Pane): Promise<void> {
	const before = await panesOf(page);
	await page.press(...(await rowCentre(page, '[data-tabs-item=tab][data-tabs-id="tab-10"]')));
	await waited(SETTLED_MS);
	const after = await panesOf(page);
	const [first, second] = [await paneById(page, tab8.id), await paneById(page, tab10.id)];
	await shot(page, "4-sidebar-press-on-an-open-tab-focuses-it.png");
	check(
		"4. pressing an open tab in the sidebar focuses its pane, and no pane changes what it shows",
		first.isDimmed &&
			!second.isDimmed &&
			JSON.stringify(after.map((pane) => [pane.id, pane.crumb])) ===
				JSON.stringify(before.map((pane) => [pane.id, pane.crumb])),
		[before, after],
	);
}

async function chatPanesOf(page: AskedPage): Promise<Pane[]> {
	return (await panesOf(page)).filter((pane) => pane.view === "chat").sort((one, other) => one.box.top - other.box.top);
}

const SHOWN_CHAT_ROWS = `[...document.querySelectorAll("[data-ws-chat].is-active")].map((row) => row.querySelector(".wg-ws-row-title")?.textContent)`;

async function checksTwoChats(page: AskedPage): Promise<void> {
	await page.ask(`window.__RENAME_CHAT__("chat-new", "Hello")`);
	await page.ask(`window.__CREATE_CHAT__()`);
	await waited(SETTLED_MS);
	const secondId = String(
		await page.ask(
			`[...document.querySelectorAll("[data-ws-chat]")].map((row) => row.dataset.wsChat).find((id) => id !== "chat-new")`,
		),
	);
	await page.ask(`window.__RENAME_CHAT__(${JSON.stringify(secondId)}, "Second chat")`);
	await waited(SETTLED_MS);
	const [chatPane] = await chatPanesOf(page);

	if (chatPane === undefined) {
		throw new Error("no chat pane");
	}

	const from = await rowCentre(page, '[data-ws-chat="chat-new"]');
	const drag = await page.lift({
		from,
		to: [chatPane.box.left + chatPane.box.width / 2, chatPane.box.top + chatPane.box.height * 0.85],
		steps: 14,
		stepMs: 16,
	});
	await waited(SETTLED_MS);
	await shot(page, "5-chat-carried-onto-the-board.png");
	await drag.drop([chatPane.box.left + chatPane.box.width / 2, chatPane.box.top + chatPane.box.height * 0.85]);
	await waited(SETTLED_MS);
	const chats = await chatPanesOf(page);
	const shownRows = await page.ask(SHOWN_CHAT_ROWS);
	await shot(page, "6-two-chats-side-by-side.png");
	check(
		"5. a chat dropped on the board opens a second chat pane, each with its own title",
		JSON.stringify(chats.map((pane) => pane.crumb)) ===
			JSON.stringify(["Untitled workspace/Second chat", "Untitled workspace/Hello"]),
		chats.map((pane) => pane.crumb),
	);
	check(
		"5. the chat sidebar highlights both chats open in panes",
		Array.isArray(shownRows) &&
			shownRows.length === 2 &&
			shownRows.includes("Hello") &&
			shownRows.includes("Second chat"),
		shownRows,
	);
}

async function checksChatFocus(page: AskedPage): Promise<void> {
	const [upper, lower] = await chatPanesOf(page);

	if (upper === undefined || lower === undefined) {
		throw new Error("two chat panes were expected");
	}

	await page.press(...emptySpotOf(lower));
	await waited(SETTLED_MS);
	const afterLower = await chatPanesOf(page);
	await shot(page, "7-press-the-lower-chat.png");
	check(
		"6. pressing the lower chat focuses it, and neither chat pane changes its chat",
		afterLower[0]?.isDimmed === true &&
			afterLower[1]?.isDimmed === false &&
			afterLower[0]?.crumb === upper.crumb &&
			afterLower[1]?.crumb === lower.crumb,
		afterLower,
	);
	await page.press(...emptySpotOf(upper));
	await waited(SETTLED_MS);
	const afterUpper = await chatPanesOf(page);
	await shot(page, "8-press-the-upper-chat.png");
	check(
		"6. pressing the upper chat focuses it back, and neither chat pane changes its chat",
		afterUpper[0]?.isDimmed === false &&
			afterUpper[1]?.isDimmed === true &&
			afterUpper[0]?.crumb === upper.crumb &&
			afterUpper[1]?.crumb === lower.crumb,
		afterUpper,
	);
	await page.press(...(await rowCentre(page, '[data-ws-chat="chat-new"] .wg-ws-row-pick')));
	await waited(SETTLED_MS);
	const afterSidebar = await chatPanesOf(page);
	await shot(page, "9-sidebar-press-on-an-open-chat-focuses-it.png");
	check(
		"7. pressing an open chat in the sidebar focuses its pane and moves nothing",
		afterSidebar[0]?.isDimmed === true &&
			afterSidebar[1]?.isDimmed === false &&
			afterSidebar[0]?.crumb === upper.crumb &&
			afterSidebar[1]?.crumb === lower.crumb,
		afterSidebar,
	);
}

const page = await paged(origin, "pane states", { size: SIZE });
try {
	await until(page, `document.querySelector(".wg-pane") !== null`);
	await waited(SETTLED_MS);
	const tab8 = await placed(page, { kind: "app", tabId: "tab-8" }, "pane-app", "right");
	const tab10 = await placed(page, { kind: "app", tabId: "tab-10" }, tab8.id, "right");
	await shot(page, "0-board.png");
	await checksBlueOverAnotherPane(page, await paneById(page, tab8.id));
	await checksBlueOverOwnPane(page, await paneById(page, tab10.id));
	await checksPressInPage(page, tab8, tab10);
	await checksSidebarFocusesOpenTab(page, tab8, tab10);
	await checksTwoChats(page);
	await checksChatFocus(page);
} finally {
	page.close();
	server.close();
}

console.log(`\npane states: ${failed === 0 ? "clean" : "BLOCKED"} — shots in ${shotsAt}`);
process.exit(failed === 0 ? 0 : 1);
