import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { canvasSheet, withCanvasSheet } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";

const WIDTHS = [1280, 1470, 1800] as const;
const HEIGHT = 900;
const FRAME_PAD = 8;
const SLACK_PX = 1;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-app-plate"));
mkdirSync(shotsAt, { recursive: true });

const [bundle, canvas] = await Promise.all([bundleOf("tools/studio-render-page.tsx"), canvasSheet(process.cwd())]);
const sheets = [
	readFileSync("design-systems/sumi/sumi.css", "utf8"),
	readFileSync("packages/core/browser-host.css", "utf8"),
	withCanvasSheet(readFileSync("packages/host-obsidian/styles.css", "utf8"), canvas),
].join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style>
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
let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isNear(got: number, wanted: number): boolean {
	return Math.abs(got - wanted) <= SLACK_PX;
}

const BoxSchema = z.object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() });
const PlateSchema = z.object({
	frame: BoxSchema,
	chat: BoxSchema,
	app: BoxSchema,
	right: BoxSchema,
	body: BoxSchema,
	appFill: z.string(),
	plateFill: z.string(),
	crumb: z.string(),
	shown: z.object({ app: z.string(), box: BoxSchema }).nullable(),
	studio: BoxSchema.nullable(),
	drawn: BoxSchema.nullable(),
	browserShown: z.string().nullable(),
	newTab: BoxSchema.nullable(),
});

type Box = z.infer<typeof BoxSchema>;
type Plate = z.infer<typeof PlateSchema>;

const PLATE = `(() => {
	const boxOf = (element) => {
		if (!element) return null;
		const box = element.getBoundingClientRect();
		return { left: Math.round(box.left), top: Math.round(box.top), right: Math.round(box.right), bottom: Math.round(box.bottom) };
	};
	const shown = document.querySelector(".wg-shell-plate.is-app [data-studio-kept=shown]");
	const app = shown?.dataset.studioKeptApp ?? "";
	const drawn = shown?.querySelector(app === "canvas" ? "[data-canvas-board]" : "[data-browser-page-area]");
	const newTab = [...(shown?.querySelectorAll("*") ?? [])].find((one) => one.children.length === 0 && one.textContent === "Where to?");
	const plate = document.querySelector(".wg-shell-plate.is-app");
	return {
		frame: boxOf(document.querySelector(".wg-shell")),
		chat: boxOf(document.querySelector(".wg-shell-plate.is-chat")),
		app: boxOf(plate),
		right: boxOf(document.querySelector(".wg-shell-right")),
		body: boxOf(document.querySelector(".wg-shell-plate.is-app > .wg-shell-plate-body")),
		appFill: getComputedStyle(plate).backgroundColor,
		plateFill: getComputedStyle(document.querySelector(".wg-shell-plate.is-chat")).backgroundColor,
		crumb: document.querySelector(".wg-plate-head.is-app [data-plate-place=crumb]")?.textContent ?? "",
		shown: shown ? { app, box: boxOf(shown) } : null,
		studio: boxOf(shown?.querySelector("[data-canvas-studio], [data-browser-studio]")),
		drawn: boxOf(drawn),
		browserShown: window.__BROWSER_SHOWN__(),
		newTab: newTab && newTab.getClientRects().length > 0 ? boxOf(newTab) : null,
	};
})()`;

async function until(page: AskedPage, expression: string): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(expression)) === true) return true;
		await waited(100);
	}
	return false;
}

async function pressed(page: AskedPage, selector: string): Promise<void> {
	const at = await page.ask(
		`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return null; const box = element.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	);
	if (!Array.isArray(at)) throw new Error(`nothing answers ${selector}`);
	await page.press(Number(at[0]), Number(at[1]));
	await waited(600);
}

function isInside(inner: Box | null, outer: Box): boolean {
	return (
		inner !== null &&
		inner.left >= outer.left - SLACK_PX &&
		inner.right <= outer.right + SLACK_PX &&
		inner.top >= outer.top - SLACK_PX &&
		inner.bottom <= outer.bottom + SLACK_PX
	);
}

function fills(inner: Box | null, outer: Box): boolean {
	return (
		inner !== null &&
		isNear(inner.left, outer.left) &&
		isNear(inner.right, outer.right) &&
		isNear(inner.top, outer.top) &&
		isNear(inner.bottom, outer.bottom)
	);
}

function checkPlate(width: number, when: string, plate: Plate): void {
	const { frame, chat, app, right, body } = plate;
	check(
		`${width} ${when}: the app plate runs the full height of the frame`,
		isNear(app.top, frame.top + FRAME_PAD) && isNear(app.bottom, frame.bottom - FRAME_PAD),
		[app.top, app.bottom, frame.bottom],
	);
	check(
		`${width} ${when}: the app plate fills from the chat plate to the tabs column`,
		isNear(app.left, chat.right + FRAME_PAD) && isNear(app.right + FRAME_PAD, right.left),
		[chat.right, app.left, app.right, right.left],
	);
	check(`${width} ${when}: the app plate is the plate colour`, plate.appFill === plate.plateFill, [
		plate.appFill,
		plate.plateFill,
	]);
	check(`${width} ${when}: the shown app fills the plate body`, fills(plate.shown?.box ?? null, body), [
		plate.shown,
		body,
	]);
}

function checkCanvas(width: number, when: string, plate: Plate): void {
	checkPlate(width, when, plate);
	const board = plate.drawn;
	check(
		`${width} ${when}: the canvas is drawn across the plate body`,
		plate.shown?.app === "canvas" &&
			fills(plate.studio, plate.body) &&
			board !== null &&
			isInside(board, plate.body) &&
			board.right - board.left > 0 &&
			isNear(board.bottom - board.top, plate.body.bottom - plate.body.top),
		[plate.shown?.app, plate.studio, board, plate.body],
	);
}

function checkNewTab(width: number, when: string, plate: Plate, pageId: string): void {
	checkPlate(width, when, plate);
	check(
		`${width} ${when}: a browser tab with no page draws the new-tab page`,
		plate.shown?.app === "browser" && fills(plate.studio, plate.body) && isInside(plate.newTab, plate.body),
		[plate.shown?.app, plate.newTab],
	);
	check(`${width} ${when}: the browser shows the tab's own page`, plate.browserShown === pageId, plate.browserShown);
}

async function plateOf(page: AskedPage): Promise<Plate> {
	return PlateSchema.parse(await page.ask(PLATE));
}

async function walk(width: number): Promise<void> {
	const page = await paged(origin, "app plate", { size: [width, HEIGHT] });
	try {
		check(
			`${width}: the studio drew the plate and the tabs`,
			await until(
				page,
				`document.querySelector(".wg-shell-plate.is-app") !== null && document.querySelector("[data-tabs-sidebar]") !== null`,
			),
			await page.ask(`document.getElementById("boom").textContent`),
		);
		await until(page, `document.querySelector("[data-studio-kept=shown] [data-canvas-board]") !== null`);
		await waited(400);
		const opened = await plateOf(page);
		check(`${width} opened: the header names the canvas`, opened.crumb.startsWith("Canvas"), opened.crumb);
		checkCanvas(width, "opened on the canvas", opened);
		writeFileSync(path.join(shotsAt, `opened-${width}.png`), await page.shoot());

		await pressed(page, '[data-tabs-item=essential][data-tabs-id="essential-1"]');
		checkCanvas(width, "the Canvas essential", await plateOf(page));

		await pressed(page, '[data-tabs-list] [data-tabs-id="tab-8"]');
		await until(page, `document.querySelector("[data-studio-kept=shown][data-studio-kept-app=browser]") !== null`);
		await waited(300);
		checkNewTab(width, "the restarted tab in the group", await plateOf(page), "page-restarted-a");
		writeFileSync(path.join(shotsAt, `browser-${width}.png`), await page.shoot());

		await pressed(page, '[data-tabs-list] [data-tabs-id="tab-10"]');
		checkNewTab(width, "the restarted Browser tab", await plateOf(page), "page-restarted-b");

		await pressed(page, '[data-tabs-item=essential][data-tabs-id="essential-1"]');
		checkCanvas(width, "back on the Canvas essential", await plateOf(page));
		const boom = await page.ask(`document.getElementById("boom").textContent`);
		check(`${width}: nothing failed on the page`, boom === "", boom);
	} finally {
		page.close();
	}
}

try {
	for (const width of WIDTHS) await walk(width);
} finally {
	server.close();
}
console.log(`screenshots in ${shotsAt}`);
console.log(failed === 0 ? "app plate: all checks pass" : `app plate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
