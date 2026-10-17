import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import type { Theme } from "./harness.ts";
import { TABS_SEEN } from "./studio-tabs-seen.ts";
import { checkTabsSeen, isTabsSeen } from "./studio-tabs-laws.ts";
import type { TabsSeen } from "./studio-tabs-laws.ts";

const VIEW: readonly [number, number] = [1800, 900];
const THEMES: readonly Theme[] = ["light", "dark"];
const TABS_WANTED = 20;
const DRAWN = `document.querySelector("[data-app-host-bar] [data-host-tabs]") !== null`;
const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;
const CENTER_OF = `((selector) => { const node = [...document.querySelectorAll(selector)].find((one) => one.getClientRects().length > 0); if (!node) return null; const box = node.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;
const KEYED = `((key) => { document.activeElement?.blur?.(); document.body.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: true, bubbles: true, cancelable: true })); return true; })`;
const POPPED = `document.querySelectorAll("[data-slot=popover-content][data-state=open], [data-host-all-tabs-list]").length`;
const TOOLTIP_OFFENDERS = `[...document.querySelectorAll("[data-app-host-bar] button, [data-host-column] button")].filter((one) => one.getClientRects().length > 0).flatMap((control) => { const name = control.getAttribute("aria-label") ?? control.textContent.trim(); const isIconOnly = control.textContent.trim() === ""; const hasTip = control.matches("[data-tip]") || control.parentElement?.matches("[data-tip]") === true; const said = []; if (control.closest("[title]")) said.push(name + ": a native title"); if (isIconOnly && !hasTip) said.push(name + ": no studio tip"); if (hasTip && getComputedStyle(control).getPropertyValue("--no-tooltip").trim() !== "true") said.push(name + ": Obsidian tooltips its aria-label too"); return said; })`;
const ROW_HEIGHTS = `[...document.querySelectorAll("[data-host-list-tab]")].filter((row) => row.querySelector("[data-host-tab-status]") === null).map((row) => Math.round(row.getBoundingClientRect().height))`;
const SHOWN_CLOSE_PAINT = `(() => { const paint = (selector) => { const node = document.querySelector(selector); return node === null ? null : getComputedStyle(node).backgroundColor; }; return { shown: paint("[data-host-list-tab]:has([aria-current]) [data-host-close-tab]"), resting: paint("[data-host-list-tab]:not(:has([aria-current])) [data-host-close-tab]") }; })()`;
const ONE_LINE_ROW_PX = 40;
const RAIL_SLOT_PX = 40;
const EDGE_LINE_OF = `((selector) => { const edge = document.querySelector(selector); if (!edge) return null; const line = getComputedStyle(edge, "::after"); return { box: Math.round(edge.getBoundingClientRect().width), line: line.width, paint: line.backgroundColor }; })`;
const MENU_ICON_FROM_LEFT_PX = 12;
const OBSIDIAN_BUTTON =
	"button { display: inline-flex; width: auto; height: 30px; padding: 4px 12px; justify-content: center; align-items: center; border-radius: 8px; white-space: nowrap; }";
const ROW_ALIGNMENT = `[...document.querySelectorAll("[data-host-list-tab]")].map((row) => { const middleOf = (box) => box.top + box.height / 2; const box = row.getBoundingClientRect(); const words = row.querySelector("button > span:last-child").getBoundingClientRect(); const icon = row.querySelector("[data-host-tab-icon]").getBoundingClientRect(); const close = row.querySelector("[data-host-close-tab]").getBoundingClientRect(); return { wordsOff: Math.round(middleOf(words) - middleOf(box)), iconOff: Math.round(middleOf(icon) - middleOf(box)), closeOff: Math.round(middleOf(close) - middleOf(box)), iconLeft: Math.round(icon.left - box.left) }; })`;
const RAIL_SLOTS = `(() => { const slots = [...document.querySelectorAll("[data-host-rail-tab]")].filter((one) => one.getClientRects().length > 0); const boxes = slots.map((slot) => { const box = slot.getBoundingClientRect(); const icon = slot.querySelector("[data-host-tab-icon]").getBoundingClientRect(); return { w: Math.round(box.width), h: Math.round(box.height), iconW: Math.round(icon.width), iconH: Math.round(icon.height), middle: Math.round(box.left + box.width / 2), iconMiddle: Math.round(icon.left + icon.width / 2), top: box.top, bottom: box.bottom, isNext: slot.nextElementSibling?.matches("[data-host-rail-tab]") === true }; }); const gaps = boxes.flatMap((one, at) => one.isNext && boxes[at + 1] ? [Math.round(boxes[at + 1].top - one.bottom)] : []); return { sizes: [...new Set(boxes.map((one) => [one.w, one.h, one.iconW, one.iconH].join("x")))], middles: [...new Set(boxes.flatMap((one) => [one.middle, one.iconMiddle]))], gaps: [...new Set(gaps)] }; })()`;
const MENU_ITEMS = `(() => { const list = document.querySelector("[data-host-column-menu-list]"); if (!list) return null; const items = [...list.querySelectorAll(":scope > button")]; const inner = list.getBoundingClientRect(); const pop = list.closest(".wg-kit-pop"); const pad = parseFloat(getComputedStyle(list.parentElement).paddingLeft); return { items: items.map((item) => { const box = item.getBoundingClientRect(); const icon = item.querySelector("svg").getBoundingClientRect(); return { fullWidth: Math.abs(box.width - inner.width) <= 1, iconFromLeft: Math.round(icon.left - box.left), radius: parseFloat(getComputedStyle(item, "::before").borderTopLeftRadius) }; }), plate: parseFloat(getComputedStyle(pop).borderTopLeftRadius), pad }; })()`;
const SCROLLED = `(() => { const scroller = [...document.querySelectorAll("[data-host-column-scroll]")].find((one) => one.getClientRects().length > 0); if (!scroller) return null; scroller.scrollTop = scroller.scrollHeight; return { overflows: scroller.scrollHeight > scroller.clientHeight, scrolledTo: Math.round(scroller.scrollTop) }; })()`;

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-tabs"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${OBSIDIAN_BUTTON}</style><style>${sheets}</style></head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = "studio";</script>
<script>${bundle}</script></body></html>`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isPoint(value: unknown): value is PagePoint {
	return Array.isArray(value) && value.length === 2 && value.every((held) => typeof held === "number");
}

async function seenOf(page: AskedPage): Promise<TabsSeen> {
	const asked = await page.ask(TABS_SEEN);
	if (!isTabsSeen(asked)) throw new Error(`the studio drew no tabs: ${JSON.stringify(asked)}`);
	return asked;
}

async function pointOf(page: AskedPage, selector: string): Promise<PagePoint> {
	const asked = await page.ask(`${CENTER_OF}(${JSON.stringify(selector)})`);
	if (!isPoint(asked)) throw new Error(`nothing on screen answers ${selector}`);
	return asked;
}

async function pressed(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await pointOf(page, selector);
	await page.press(x, y);
	await waited(150);
}

async function keyed(page: AskedPage, key: string): Promise<void> {
	await page.ask(`${KEYED}(${JSON.stringify(key)})`);
	await waited(150);
}

async function draggedEdgeBy(page: AskedPage, byPx: number): Promise<void> {
	const from = await pointOf(page, "[data-host-column-edge]");
	const to: PagePoint = [from[0] + byPx, from[1]];
	await page.drag({ from, to, steps: 10, stepMs: 16 });
	await page.release(to);
	await waited(200);
}

async function openedTabs(page: AskedPage, count: number): Promise<void> {
	for (let opened = 0; opened < count; opened += 1) {
		await pressed(page, "[data-host-add]");
		await pressed(page, '[data-host-new-tab="canvas"]');
	}
}

async function shotsOf(page: AskedPage, name: string): Promise<void> {
	for (const theme of THEMES) {
		await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
		await waited(120);
		writeFileSync(path.join(shotsAt, `${name}-${theme}.png`), await page.shoot());
	}
	await page.ask(`${THEMED}("light")`);
}

async function checksOneTooltip(page: AskedPage, look: string): Promise<void> {
	const offenders = await page.ask(TOOLTIP_OFFENDERS);
	check(
		`${look}: every control has one tooltip, the studio's, and no native title`,
		Array.isArray(offenders) && offenders.length === 0,
		offenders,
	);
}

async function checksRowAlignment(page: AskedPage): Promise<void> {
	const [x, y] = await pointOf(page, "[data-host-list-tab]:not(:has([aria-current]))");
	await page.hover(x - 40, y);
	await waited(150);
	const rows = await page.ask(ROW_ALIGNMENT);
	check(
		"under Obsidian's button rule, every row's icon, words and × sit on its middle, and every icon, hovered or not, starts at one edge",
		Array.isArray(rows) &&
			rows.length > 0 &&
			rows.every(
				(row) =>
					isRecord(row) &&
					Math.abs(Number(row["wordsOff"])) <= 1 &&
					Math.abs(Number(row["iconOff"])) <= 1 &&
					Math.abs(Number(row["closeOff"])) <= 1 &&
					row["iconLeft"] === (isRecord(rows[0]) ? rows[0]["iconLeft"] : null),
			),
		Array.isArray(rows) ? rows.slice(0, 3) : rows,
	);
}

async function checksRailSlots(page: AskedPage): Promise<void> {
	const slots = await page.ask(RAIL_SLOTS);
	check(
		`every rail tab is one ${RAIL_SLOT_PX}px slot, its fill the same shape, on one axis, with equal gaps`,
		isRecord(slots) &&
			JSON.stringify(slots["sizes"]) ===
				JSON.stringify([`${RAIL_SLOT_PX}x${RAIL_SLOT_PX}x${RAIL_SLOT_PX}x${RAIL_SLOT_PX}`]) &&
			Array.isArray(slots["middles"]) &&
			slots["middles"].length === 1 &&
			Array.isArray(slots["gaps"]) &&
			slots["gaps"].length === 1,
		slots,
	);
}

async function hoveredEdgeLine(page: AskedPage, selector: string): Promise<unknown> {
	const [x, y] = await pointOf(page, selector);
	await page.hover(x, y);
	await waited(250);
	return page.ask(`${EDGE_LINE_OF}(${JSON.stringify(selector)})`);
}

async function checksEdgeLine(page: AskedPage): Promise<void> {
	const column = await hoveredEdgeLine(page, "[data-host-column-edge]");
	const chat = await hoveredEdgeLine(page, ".wg-studio-chat-edge");
	check(
		"the column's resize edge, hovered, is the chat edge: same box, line and accent",
		chat !== null && JSON.stringify(column) === JSON.stringify(chat),
		{ column, chat },
	);
}

async function checksMenuItems(page: AskedPage): Promise<void> {
	await pressed(page, "[data-host-column-menu]");
	const menu = await page.ask(MENU_ITEMS);
	await pressed(page, "[data-host-column-menu]");
	const items = isRecord(menu) && Array.isArray(menu["items"]) ? menu["items"] : [];
	const concentric = isRecord(menu) ? Number(menu["plate"]) - Number(menu["pad"]) : null;
	check(
		"every column menu item spans the menu, starts with its icon at the left, and its corner nests in the plate",
		items.length > 0 &&
			items.every(
				(item) =>
					isRecord(item) &&
					item["fullWidth"] === true &&
					Number(item["iconFromLeft"]) <= MENU_ICON_FROM_LEFT_PX &&
					item["radius"] === concentric,
			),
		menu,
	);
}

async function checksRowFace(page: AskedPage): Promise<void> {
	await checksRowAlignment(page);
	const heights = await page.ask(ROW_HEIGHTS);
	check(
		`every one-line row is ${ONE_LINE_ROW_PX}px tall`,
		Array.isArray(heights) && heights.length > 0 && heights.every((height) => height === ONE_LINE_ROW_PX),
		heights,
	);
	const paint = await page.ask(SHOWN_CLOSE_PAINT);
	check(
		"× on the shown row is a tint of the row, not the resting rows' plate",
		isRecord(paint) &&
			typeof paint["shown"] === "string" &&
			typeof paint["resting"] === "string" &&
			paint["shown"] !== paint["resting"],
		paint,
	);
}

async function checksHidden(page: AskedPage): Promise<void> {
	const seen = await seenOf(page);
	checkTabsSeen("hidden", seen, check);
	await checksOneTooltip(page, "hidden");
	await shotsOf(page, "hidden");
	await pressed(page, "[data-host-all-tabs]");
	const opened = await seenOf(page);
	check(
		"⌄ opens the tab column and no list pops over",
		opened.look !== "hidden" && Number(await page.ask(POPPED)) === 0,
		{ look: opened.look, popped: await page.ask(POPPED) },
	);
}

async function checksIcons(page: AskedPage): Promise<void> {
	const seen = await seenOf(page);
	checkTabsSeen("icons", seen, check);
	await checksOneTooltip(page, "icons");
	await checksRailSlots(page);
	await checksEdgeLine(page);
	const scrolled = await page.ask(SCROLLED);
	check(
		`the icon column scrolls with ${seen.tabCount} tabs`,
		JSON.stringify(scrolled).includes('"overflows":true') && !JSON.stringify(scrolled).includes('"scrolledTo":0'),
		scrolled,
	);
	await page.ask(
		`(() => { const scroller = document.querySelector("[data-host-column-scroll]"); scroller.scrollTop = 0; return true; })()`,
	);
	const target = seen.columnTabs.find((tab) => !tab.isShown);
	await pressed(page, `[data-host-rail-tab="${target?.id ?? ""}"]`);
	const after = await seenOf(page);
	check(
		"a press on an icon switches the tab and leaves the column as icons",
		after.look === "icons" && after.columnTabs.some((tab) => tab.id === target?.id && tab.isShown),
		{ look: after.look, shown: after.columnTabs.filter((tab) => tab.isShown).map((tab) => tab.id), wanted: target?.id },
	);
	await shotsOf(page, "icons");
}

async function checksFull(page: AskedPage): Promise<void> {
	await draggedEdgeBy(page, -200);
	const seen = await seenOf(page);
	checkTabsSeen("full", seen, check);
	await checksOneTooltip(page, "full");
	await checksRowFace(page);
	await checksMenuItems(page);
	await shotsOf(page, "full");
	const before = seen.tabCount;
	await keyed(page, "w");
	const closed = await seenOf(page);
	check("⌘W closes the shown tab", closed.tabCount === before - 1 && closed.columnTabs.some((tab) => tab.isShown), {
		was: before,
		now: closed.tabCount,
	});
	await draggedEdgeBy(page, 160);
	check(
		"dragging the edge narrow snaps the column to icons",
		(await seenOf(page)).look === "icons",
		(await seenOf(page)).look,
	);
	await draggedEdgeBy(page, 60);
	const hidden = await seenOf(page);
	check(
		"dragging past the least width hides the column and the header takes the tabs back",
		hidden.look === "hidden" && hidden.headerTabs > 0,
		hidden,
	);
	await keyed(page, "\\");
	check("⌘\\ shows the column again", (await seenOf(page)).look === "icons", (await seenOf(page)).look);
}

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "studio tabs", { size: VIEW });

try {
	const drawn = await waitUntil(async () => (await page.ask(DRAWN)) === true, 5000, 50);
	check("the studio drew the tabs header", drawn, drawn);
	await page.reduceMotion();
	await waited(300);
	await openedTabs(page, TABS_WANTED - 1);
	await checksHidden(page);
	await checksIcons(page);
	await checksFull(page);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
} finally {
	page.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "studio tabs: clean" : `studio tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
