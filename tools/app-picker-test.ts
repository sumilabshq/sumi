import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import type { Theme } from "./harness.ts";
import {
	BOARD,
	DRAWN,
	GLASS,
	HOVER_PAINT,
	KEYED,
	METRICS,
	OBSIDIAN_CONTROLS,
	PLANNED,
	THEMED,
	columnShown,
	isOpen,
	opened,
	pickedOf,
	pointOf,
	pressed,
	rowOf,
	searched,
} from "./app-picker-page.ts";
import { contextPressed, draggedEdgeBy } from "./studio-tabs-page.ts";

const VIEW: readonly [number, number] = [1800, 1000];
const THEMES: readonly Theme[] = ["light", "dark"];
const GLASS_BLUR = "blur(26px) saturate(1.7)";
const GLASS_CORNER_PX = 24;
const MENU_PX = 232;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-app-picker"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const pageOf = (
	mode: string,
): string => `<!doctype html><html><head><meta charset="utf-8"><style>${OBSIDIAN_CONTROLS}</style><style>${sheets}</style></head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = ${JSON.stringify(mode)};</script>
<script>${bundle}</script></body></html>`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

async function checksRows(page: AskedPage): Promise<void> {
	const hasHeaderAdd = await page.ask(`document.querySelector("[data-host-add]") !== null`);
	await opened(page);
	check("Open app at the column's bottom opens the picker, and the header holds no +", await isOpen(page), {
		isOpen: await isOpen(page),
		hasHeaderAdd,
	});
	await waitUntil(async () => (await pickedOf(page)).rows.some((row) => row.kind === "mine"), 2000, 50);
	const picked = await pickedOf(page);
	const kinds = picked.rows.map((row) => row.kind);
	check(
		"the picker reads Open an app, then built-in apps, the person's own, the planned ones, and Browse the catalogue after a line",
		picked.heading === "Open an app" &&
			hasHeaderAdd === false &&
			kinds.indexOf("mine") > kinds.lastIndexOf("built-in") &&
			kinds.indexOf("planned") > kinds.lastIndexOf("mine") &&
			picked.lastIsBrowse &&
			picked.browse === "Browse the catalogue",
		{ heading: picked.heading, kinds, browse: picked.browse },
	);
	check(
		"Browser and Canvas are Built in, the person's apps say You, and no row names the product",
		rowOf(picked, "browser")?.source === "Built in" &&
			rowOf(picked, "canvas")?.source === "Built in" &&
			rowOf(picked, "Apps/Barn")?.source === "You" &&
			!picked.said.includes("Widgetarium"),
		picked.rows.map((row) => `${row.id}:${row.source}`),
	);
	check(
		"every planned app is listed, disabled, and says Later",
		PLANNED.every((id) => rowOf(picked, id)?.isDisabled === true && rowOf(picked, id)?.source === "Later") &&
			rowOf(picked, "browser")?.isDisabled === false,
		picked.rows.filter((row) => row.kind === "planned").map((row) => `${row.id}:${row.source}:${row.isDisabled}`),
	);
}

async function checksMetrics(page: AskedPage): Promise<void> {
	const metrics = await page.ask(METRICS);
	check(
		"the picker is the board's: 300px glass, 40px heading, search and rows, 28px round icons, 14px names, the source at the end",
		isRecord(metrics) &&
			metrics["panelPx"] === BOARD.panelPx &&
			metrics["panelCornerPx"] === BOARD.panelCornerPx &&
			metrics["headingPx"] === BOARD.headingPx &&
			metrics["searchPx"] === BOARD.searchPx &&
			metrics["rowPx"] === BOARD.rowPx &&
			JSON.stringify(metrics["discPx"]) === JSON.stringify([BOARD.discPx, BOARD.discPx]) &&
			metrics["rowFont"] === BOARD.rowFont &&
			metrics["sourceFont"] === BOARD.sourceFont &&
			metrics["sourceAtEnd"] === true &&
			metrics["isInView"] === true,
		metrics,
	);
}

async function checksSearch(page: AskedPage): Promise<void> {
	const narrowed = await searched(page, "brow");
	const none = await searched(page, "zzzz");
	await searched(page, "");
	check(
		"search narrows the rows, and a search nothing answers says so",
		narrowed.rows.length === 1 &&
			narrowed.rows[0]?.id === "browser" &&
			none.rows.length === 0 &&
			none.said.includes("No app matches"),
		{ narrowed: narrowed.rows.map((row) => row.id), none: none.rows.length },
	);
}

async function checksHover(page: AskedPage): Promise<void> {
	const rest = await page.ask(`${HOVER_PAINT}("canvas")`);
	const [x, y] = await pointOf(page, '[data-host-picker-row="canvas"] [data-host-picker-name]');
	await page.hover(x, y);
	await waited(200);
	const hovered = await page.ask(`${HOVER_PAINT}("canvas")`);
	check(
		"a hovered row takes the brand-tinted glass hover",
		typeof hovered === "string" && hovered !== rest && hovered !== "rgba(0, 0, 0, 0)",
		{ rest, hovered },
	);
}

async function checksAdd(page: AskedPage): Promise<void> {
	const before = Number(
		await page.ask(
			`[...document.querySelectorAll("[data-host-rail-tab], [data-host-list-tab]")].filter((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible").length`,
		),
	);
	await pressed(page, '[data-host-picker-row="browser"]');
	const closedOnAdd = !(await isOpen(page));
	const after = Number(
		await page.ask(
			`[...document.querySelectorAll("[data-host-rail-tab], [data-host-list-tab]")].filter((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible").length`,
		),
	);
	const shownApp = await page.ask(
		`[...document.querySelectorAll("[data-host-rail-tab][aria-current]")].find((one) => getComputedStyle(one).visibility === "visible")?.dataset.hostTabApp ?? null`,
	);
	check(
		"choosing Browser opens a new browser tab and closes the picker",
		closedOnAdd && after === before + 1 && shownApp === "browser",
		{
			before,
			after,
			closedOnAdd,
			shownApp,
		},
	);
}

async function checksClosing(page: AskedPage): Promise<void> {
	await opened(page);
	await page.ask(`${KEYED}("Escape", "[data-host-picker-field]")`);
	await waited(300);
	const afterEscape = await isOpen(page);
	await opened(page);
	await page.press(40, VIEW[1] - 40);
	await waited(300);
	const afterOutside = await isOpen(page);
	await opened(page);
	await pressed(page, "[data-host-picker-browse]");
	check(
		"Escape, a press outside and Browse the catalogue each close the picker",
		!afterEscape && !afterOutside && !(await isOpen(page)),
		{
			afterEscape,
			afterOutside,
			afterBrowse: await isOpen(page),
		},
	);
}

async function glassOf(page: AskedPage, name: string, minWidth: number): Promise<void> {
	await waited(250);
	const glass = await page.ask(GLASS);
	check(
		`${name} wears the studio glass: translucent fill, ${GLASS_BLUR}, a hairline edge, ${GLASS_CORNER_PX}px corners`,
		isRecord(glass) &&
			glass["filter"] === GLASS_BLUR &&
			typeof glass["alpha"] === "number" &&
			glass["alpha"] < 1 &&
			glass["alpha"] > 0.5 &&
			glass["edge"] === true &&
			glass["corner"] === GLASS_CORNER_PX &&
			Number(glass["width"]) >= minWidth,
		glass,
	);
}

async function closedPopovers(page: AskedPage): Promise<void> {
	await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
	await waited(250);
}

async function checksGlassEverywhere(page: AskedPage): Promise<void> {
	await opened(page);
	await glassOf(page, "the app picker", BOARD.panelPx);
	await closedPopovers(page);
	await columnShown(page);
	await contextPressed(page, await pointOf(page, "[data-host-rail-tab]"));
	await glassOf(page, "the tab menu", MENU_PX);
	await closedPopovers(page);
	await pressed(page, '[data-host-rail-tab][data-host-tab-app="canvas"]');
	await pressed(page, "[data-canvas-page-name]");
	await glassOf(page, "the page picker", MENU_PX);
	await closedPopovers(page);
	await pressed(page, ".wg-studio-menu-trigger");
	await glassOf(page, "the chat's … menu", MENU_PX);
	await closedPopovers(page);
	await draggedEdgeBy(page, -200);
	await pressed(page, "[data-host-column-menu]");
	await glassOf(page, "the column menu", MENU_PX);
	await closedPopovers(page);
}

async function shotsOf(page: AskedPage): Promise<void> {
	await opened(page);
	const [x, y] = await pointOf(page, '[data-host-picker-row="canvas"] [data-host-picker-name]');
	await page.ask("document.activeElement?.blur?.(); true");
	for (const theme of THEMES) {
		await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
		await page.hover(x, y);
		await waited(200);
		writeFileSync(path.join(shotsAt, `picker-${theme}.png`), await page.shoot());
	}
	await page.ask(`${THEMED}("light")`);
	await closedPopovers(page);
}

async function checksNoHostApps(page: AskedPage): Promise<void> {
	await opened(page);
	const picked = await pickedOf(page);
	check(
		"with no apps from the host, no row says You",
		picked.rows.every((row) => row.kind !== "mine"),
		picked.rows.map((row) => row.kind),
	);
}

const server = http.createServer((request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(pageOf(request.url === "/bare" ? "studio" : "studio-workspaces"));
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

async function drawnPage(url: string, gate: string): Promise<AskedPage> {
	const page = await paged(url, gate, { size: VIEW });
	const drawn = await waitUntil(async () => (await page.ask(DRAWN)) === true, 5000, 50);
	check(`${gate}: the studio drew the header`, drawn, drawn);
	await page.reduceMotion();
	await waited(300);
	return page;
}

const page = await drawnPage(origin, "app picker");

try {
	await checksRows(page);
	await checksMetrics(page);
	await checksSearch(page);
	await checksHover(page);
	await shotsOf(page);
	await opened(page);
	await checksAdd(page);
	await checksClosing(page);
	await checksGlassEverywhere(page);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
} finally {
	page.close();
}

const barePage = await drawnPage(`${origin}bare`, "app picker, no host apps");

try {
	await checksNoHostApps(barePage);
} finally {
	barePage.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "app picker: clean" : `app picker: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
