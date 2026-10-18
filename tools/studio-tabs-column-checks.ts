import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";
import { check, pointOf, pressed } from "./studio-tabs-page.ts";
import { DROP_INSIDE_PX, draggedRow, listOrderOf, railOrderOf } from "./studio-tabs-rows.ts";
import type { ListRow } from "./studio-tabs-rows.ts";

const RAIL_ORDER = `[...document.querySelectorAll("[data-host-rail-tab]")].filter((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible").map((one) => one.dataset.hostRailTab)`;
const NEW_TAB_ROW = `(() => { const row = [...document.querySelectorAll("[data-host-tab-list] [data-host-column-add]")].find((one) => one.getClientRects().length > 0); const tab = document.querySelector("[data-host-list-tab]"); if (!row || !tab) return null; const style = getComputedStyle(row); const icon = row.querySelector("svg").getBoundingClientRect(); const tabIcon = tab.querySelector("[data-host-tab-icon] svg").getBoundingClientRect(); const words = [...row.childNodes].find((node) => node.nodeType === 3); const range = document.createRange(); range.selectNodeContents(words); const label = range.getBoundingClientRect(); const title = tab.querySelector("button > span:last-child").getBoundingClientRect(); const key = row.querySelector("[data-host-new-tab-key]").getBoundingClientRect(); const box = row.getBoundingClientRect(); return { fill: style.backgroundColor, justify: style.justifyContent, iconOff: Math.round(icon.left - tabIcon.left), labelOff: Math.round(label.left - title.left), keyAtEnd: box.right - key.right <= 20 && key.left - label.right > 20, key: row.querySelector("[data-host-new-tab-key]").textContent }; })()`;
const TITLE_TYPE = `(() => { const title = document.querySelector("[data-host-list-tab] button > span:last-child > span"); const style = getComputedStyle(title); return { size: style.fontSize, line: Math.round(title.getBoundingClientRect().height) }; })()`;
const GRIP_PLACE = `(() => { const row = [...document.querySelectorAll("[data-host-list-tab]")].find((one) => one.matches(":hover")); if (!row) return null; const grip = row.querySelector("[data-host-tab-grip]"); const box = grip.getBoundingClientRect(); const icon = row.querySelector("[data-host-tab-icon]").getBoundingClientRect(); const glyph = grip.querySelector("svg").getBoundingClientRect(); return { position: getComputedStyle(grip).position, shown: getComputedStyle(grip).display !== "none", glyph: Math.round(glyph.width), inPadding: glyph.left >= row.getBoundingClientRect().left && glyph.left < icon.left, iconLeft: Math.round(icon.left - row.getBoundingClientRect().left) }; })()`;
const BOARD_ROW_PX = 40;
const BOARD_TITLE = { size: "13px", line: 17 };
const BOARD_GRIP_PX = 14;
const ROW_ICON_LEFT_PX = 12;

export async function checksDragReorders(page: AskedPage): Promise<void> {
	const before = await listOrderOf(page);
	const open = before.filter((row) => !row.isPinned);
	const [first, , third] = open;
	if (!first || !third) throw new Error("the list holds fewer than three open tabs");
	await draggedRow(page, third, first.top + DROP_INSIDE_PX);
	const after = await listOrderOf(page);
	const openAfter = after.filter((row) => !row.isPinned).map((row) => row.id);
	check(
		"a drag reorders the rows: the third open tab lands before the first",
		openAfter[0] === third.id && openAfter[1] === first.id,
		openAfter.slice(0, 4),
	);
	const lastPinned = after.filter((row) => row.isPinned).at(-1);
	const dragged = after.find((row) => row.id === third.id);
	if (!lastPinned || !dragged) throw new Error("the list lost its pinned group");
	await draggedRow(page, dragged, lastPinned.bottom - DROP_INSIDE_PX);
	const pinned = (await listOrderOf(page)).filter((row) => row.isPinned).map((row) => row.id);
	check("a drop across the divider pins the tab, last of the pinned", pinned.at(-1) === third.id, pinned);
}

export async function checksMenuPins(page: AskedPage): Promise<void> {
	const pinnedTab = (await listOrderOf(page)).filter((row) => row.isPinned).at(-1);
	if (!pinnedTab) throw new Error("no pinned tab to unpin");
	const unpinned = await pinnedFromMenu(page, pinnedTab.id, "unpin");
	const firstOpen = unpinned.find((row) => !row.isPinned);
	check(
		"the menu unpins a tab, and it leads the open tabs",
		firstOpen?.id === pinnedTab.id,
		unpinned.map((row) => `${row.id}${row.isPinned ? "*" : ""}`).slice(0, 5),
	);
	const repinned = await pinnedFromMenu(page, pinnedTab.id, "pin");
	check(
		"the menu pins it back, last of the pinned",
		repinned.filter((row) => row.isPinned).at(-1)?.id === pinnedTab.id,
		repinned.map((row) => `${row.id}${row.isPinned ? "*" : ""}`).slice(0, 5),
	);
}

export async function checksBoardSizes(page: AskedPage): Promise<void> {
	const type = await page.ask(TITLE_TYPE);
	check(
		`a row's title is the board's ${BOARD_TITLE.size} on a ${BOARD_TITLE.line}px line, in a ${BOARD_ROW_PX}px row`,
		isRecord(type) && type["size"] === BOARD_TITLE.size && type["line"] === BOARD_TITLE.line,
		type,
	);
	const row = (await listOrderOf(page)).find((one) => !one.isPinned);
	if (!row) throw new Error("no open row to hover");
	await page.hover(row.x, (row.top + row.bottom) / 2);
	await waited(150);
	const grip = await page.ask(GRIP_PLACE);
	check(
		`the hovered row's ${BOARD_GRIP_PX}px grip stands in its left padding and takes no layout space`,
		isRecord(grip) &&
			grip["position"] === "absolute" &&
			grip["shown"] === true &&
			grip["glyph"] === BOARD_GRIP_PX &&
			grip["inPadding"] === true &&
			grip["iconLeft"] === ROW_ICON_LEFT_PX,
		grip,
	);
	const newTab = await page.ask(NEW_TAB_ROW);
	check(
		"New tab is a plain row: no plate, left-aligned, its key hint at the end",
		isRecord(newTab) &&
			newTab["fill"] === "rgba(0, 0, 0, 0)" &&
			newTab["justify"] !== "center" &&
			newTab["keyAtEnd"] === true,
		newTab,
	);
}

export async function checksOrderKept(page: AskedPage, listed: readonly string[]): Promise<void> {
	const rail = await page.ask(RAIL_ORDER);
	check(
		"the order and pins outlive the column's look: the rail draws the list's order",
		JSON.stringify(rail) === JSON.stringify(listed),
		{ rail: Array.isArray(rail) ? rail.slice(0, 6) : rail, listed: listed.slice(0, 6) },
	);
}

export async function checksRailDrag(page: AskedPage): Promise<void> {
	const open = (await railOrderOf(page)).filter((row) => !row.isPinned);
	const [first, , third] = open;
	if (!first || !third) throw new Error("the rail holds fewer than three open tabs");
	await draggedRow(page, third, first.top + DROP_INSIDE_PX);
	const after = (await railOrderOf(page)).filter((row) => !row.isPinned).map((row) => row.id);
	check("a drag in the icon rail reorders it too", after[0] === third.id && after[1] === first.id, after.slice(0, 4));
}

async function pinnedFromMenu(page: AskedPage, id: string, choice: "pin" | "unpin"): Promise<readonly ListRow[]> {
	const [x, y] = await pointOf(page, `[data-host-list-tab="${id}"]`);
	await page.hover(x, y);
	await waited(150);
	await pressed(page, `[data-host-tab-more="${id}"]`);
	await pressed(page, `[data-host-pin-tab="${choice}"]`);
	return listOrderOf(page);
}
