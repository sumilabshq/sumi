import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";
import { check, contextPressed, pointOf, pressed, seenOf } from "./studio-tabs-page.ts";
import { listOrderOf } from "./studio-tabs-rows.ts";

const MENU_BOX = `(() => { const list = document.querySelector("[data-host-tab-menu]"); const pop = list?.closest(".wg-kit-pop"); if (!pop) return null; const box = pop.getBoundingClientRect(); return { tab: list.dataset.hostTabMenu, left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: innerWidth, height: innerHeight }; })()`;
const MENU_ITEMS = `(() => { const list = document.querySelector("[data-host-tab-menu]"); if (!list) return null; return { separators: list.querySelectorAll("[role=separator]").length, items: [...list.querySelectorAll("[data-host-tab-action]")].map((item) => { const hint = item.querySelector(".wg-kit-menu-shortcut"); const box = item.getBoundingClientRect(); return { key: item.dataset.hostTabAction, disabled: item.disabled, hint: hint?.textContent ?? null, hintAtEnd: hint === null ? null : box.right - hint.getBoundingClientRect().right <= 16 }; }) }; })()`;
const MORE_BUTTONS = `(() => ({ more: document.querySelectorAll("[data-host-tab-more]").length, rowButtons: [...new Set([...document.querySelectorAll("[data-host-list-tab]")].map((row) => row.querySelectorAll("button").length))], railButtons: [...new Set([...document.querySelectorAll("[data-host-rail-tab]")].map((one) => one.parentElement.querySelectorAll("button").length))], ellipses: document.querySelectorAll("[data-host-column] [data-host-list-tab] svg.lucide-ellipsis, [data-host-column] [data-host-rail-tab] svg.lucide-ellipsis").length }))()`;
const ESCAPED = `(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return true; })()`;
const ROW_WORDS = `((id) => document.querySelector('[data-host-list-tab="' + id + '"]')?.textContent.trim() ?? null)`;
const TYPED_INTO = `((id, typed, key) => { const field = document.querySelector('[data-host-tab-rename="' + id + '"]'); if (!field) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(field, typed); field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); return true; })`;
const FOOT_ROWS = `(() => { const isShown = (one) => one !== null && one.getClientRects().length > 0; const add = [...document.querySelectorAll("[data-host-column] [data-host-column-add]")].find(isShown); const apps = [...document.querySelectorAll("[data-host-column] [data-host-column-open-app]")].find(isShown); if (!add || !apps) return null; const a = add.getBoundingClientRect(); const b = apps.getBoundingClientRect(); return { add: [Math.round(a.width), Math.round(a.height)], apps: [Math.round(b.width), Math.round(b.height)], stacked: b.top >= a.bottom - 1, sameAxis: Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)) <= 1, words: [add.textContent.trim(), apps.textContent.trim()] }; })()`;
const PICKER_OPEN = `document.querySelector("[data-host-app-picker]")?.getClientRects().length > 0`;
const STUBBED_CLIPBOARD = `(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text) => { window.__COPIED__ = text; return Promise.resolve(); } } }); return true; })()`;
const COPIED_NOTE = `(() => { const note = document.querySelector("[data-host-link-copied]"); if (!note) return null; const icon = note.querySelector("svg"); return { said: note.textContent.trim(), copied: window.__COPIED__ ?? null, tick: getComputedStyle(icon).color, words: getComputedStyle(note).color }; })()`;
const LAST_ON_SCREEN_END = `((selector) => { const ends = [...document.querySelectorAll(selector)].map((node) => { const box = node.getBoundingClientRect(); return [node, box.right - 4, box.top + box.height / 2]; }).filter(([node, x, y]) => node.contains(document.elementFromPoint(x, y))); const last = ends.at(-1); return last ? [last[1], last[2]] : null; })`;
const POINTER_INSIDE_PX = 1;
const SCREEN_MARGIN_PX = 8;
const MENU_SHOT_HOVER_PX = 24;
const LINK_COPIED_GONE_MS = 1700;
const ACTION_ORDER = [
	"new-below",
	"duplicate",
	"reload",
	"rename",
	"pin",
	"copy-link",
	"close",
	"close-others",
	"reopen",
];

export async function checksNoMoreButton(page: AskedPage, look: string): Promise<void> {
	const seen = await page.ask(MORE_BUTTONS);
	check(
		`${look}: no row or icon carries a … button; a row holds only its pick and ×, an icon only itself`,
		isRecord(seen) &&
			seen["more"] === 0 &&
			seen["ellipses"] === 0 &&
			JSON.stringify(seen["rowButtons"]) === (look === "full" ? "[2]" : "[]") &&
			JSON.stringify(seen["railButtons"]) === (look === "icons" ? "[1]" : "[]"),
		seen,
	);
}

export async function checksMenuAtPointer(page: AskedPage, selector: string, look: string): Promise<void> {
	const [x, y] = await pointOf(page, selector);
	const middle = await menuAt(page, [x, y]);
	await dismissed(page);
	check(
		`${look}: a right-click in a tab's middle opens its menu with its top-left at the pointer, flipped only where the window ends`,
		middle !== null && isCornerAt(middle, [x, y]) && isInside(middle),
		{ pointer: [x, y], menu: middle },
	);
}

export async function checksMenuFlips(page: AskedPage, selector: string, look: string): Promise<void> {
	const nearEdge = await page.ask(`${LAST_ON_SCREEN_END}(${JSON.stringify(selector)})`);

	if (!Array.isArray(nearEdge)) {
		throw new Error(`no ${selector} stands on screen`);
	}

	const pointer: PagePoint = [Number(nearEdge[0]), Number(nearEdge[1])];
	const flipped = await menuAt(page, pointer);
	await dismissed(page);
	check(
		`${look}: near the window's right edge the menu flips to stay inside, a corner still on the pointer`,
		flipped !== null && isNear(flipped.right, pointer[0]) && isCornerAt(flipped, pointer) && isInside(flipped),
		{ pointer, menu: flipped },
	);
}

export async function checksMenuRows(page: AskedPage, canvasRow: string): Promise<void> {
	await contextPressed(page, await pointOf(page, `[data-host-list-tab="${canvasRow}"]`));
	const menu = await page.ask(MENU_ITEMS);
	await dismissed(page);
	const items = isRecord(menu) && Array.isArray(menu["items"]) ? menu["items"].filter(isRecord) : [];
	const of = (key: string): Record<string, unknown> | undefined => items.find((item) => item["key"] === key);
	check(
		"the tab menu holds every action in four groups, the inapplicable ones disabled, the key hints at the end",
		isRecord(menu) &&
			menu["separators"] === 3 &&
			JSON.stringify(items.map((item) => item["key"])) === JSON.stringify(ACTION_ORDER) &&
			of("copy-link")?.["disabled"] === true &&
			of("reload")?.["disabled"] === true &&
			of("duplicate")?.["disabled"] === false &&
			of("close")?.["hint"] === "⌘W" &&
			of("reopen")?.["hint"] === "⇧⌘T" &&
			of("close")?.["hintAtEnd"] === true,
		menu,
	);
}

export async function checksMenuOpens(page: AskedPage): Promise<void> {
	const rows = await listOrderOf(page);
	const before = rows.map((row) => row.id);
	const at = rows.findIndex((row) => !row.isPinned) + 1;
	const pressedId = before[at] ?? "";
	await pickedFromMenu(page, pressedId, "new-below");
	const below = await idsListed(page);
	check(
		"New tab below lands right after the pressed tab",
		below.length === before.length + 1 && below[at] === pressedId && !before.includes(below[at + 1] ?? pressedId),
		{ pressed: pressedId, at, now: below.slice(at - 1, at + 3) },
	);
	await pickedFromMenu(page, pressedId, "duplicate");
	const duplicated = await idsListed(page);
	const copy = duplicated[at + 1] ?? "";
	const app = await page.ask(`document.querySelector('[data-host-list-tab="${copy}"]')?.dataset.hostTabApp ?? null`);
	check(
		"Duplicate tab opens the same app right after the pressed tab",
		duplicated.length === below.length + 1 && !below.includes(copy) && app === "canvas",
		{ copy, app, now: duplicated.slice(at - 1, at + 3) },
	);
}

export async function checksRename(page: AskedPage, id: string): Promise<void> {
	const was = await page.ask(`${ROW_WORDS}(${JSON.stringify(id)})`);
	const saved = await renamed(page, id, "Sprint board", "Enter");
	check(
		"Rename tab… opens a field in the row, ⏎ saves the label as the title and the app becomes the subtitle",
		saved === "Sprint board · Canvas",
		{ was, saved },
	);
	const cancelled = await renamed(page, id, "Something else", "Escape");
	check("Esc in the rename field keeps the label", cancelled === saved, cancelled);
	const cleared = await renamed(page, id, "", "Enter");
	check("an empty label clears the rename", cleared === was, { was, cleared });
}

export async function checksCloseOthersAndReopen(page: AskedPage, id: string): Promise<void> {
	const before = await listOrderOf(page);
	await pickedFromMenu(page, id, "close-others");
	const kept = await listOrderOf(page);
	check(
		"Close other tabs leaves the pinned tabs and the pressed one",
		kept.every((row) => row.isPinned || row.id === id) &&
			kept.length === before.filter((row) => row.isPinned).length + 1,
		kept.map((row) => row.id),
	);
	const lastClosed = before.filter((row) => !row.isPinned && row.id !== id).at(0)?.id;
	await pickedFromMenu(page, id, "reopen");
	const reopened = await idsListed(page);
	check(
		"Reopen closed tab brings the last closed tab back where it stood",
		reopened.length === kept.length + 1 && reopened.includes(lastClosed ?? ""),
		{ lastClosed, reopened },
	);
}

export async function checksNewTabActions(page: AskedPage, look: "full" | "icons"): Promise<void> {
	const wasShown = (await seenOf(page)).columnTabs.find((tab) => tab.isShown)?.id ?? "";
	const rows = await page.ask(FOOT_ROWS);
	const isRail = look === "icons";
	check(
		isRail
			? "the rail ends in two stacked 40px round buttons: + and Open app"
			: "the column ends in two rows: New tab, then Open app…",
		isRecord(rows) &&
			rows["stacked"] === true &&
			rows["sameAxis"] === true &&
			(isRail
				? JSON.stringify(rows["add"]) === "[40,40]" && JSON.stringify(rows["apps"]) === "[40,40]"
				: JSON.stringify(rows["words"]).startsWith('["New tab') &&
					Array.isArray(rows["words"]) &&
					rows["words"][1] === "Open app"),
		rows,
	);
	const before = (await seenOf(page)).tabCount;
	await pressed(page, "[data-host-column] [data-host-column-add]");
	const added = await seenOf(page);
	check(`${look}: + New tab opens a browser tab`, added.tabCount === before + 1, { before, now: added.tabCount });
	await pressed(page, "[data-host-column] [data-host-column-open-app]");
	const isPicking = await page.ask(PICKER_OPEN);
	const listsBrowser = await page.ask(
		`document.querySelector('[data-host-picker-row="browser"] [data-host-picker-source]')?.textContent ?? null`,
	);
	await pressed(page, "[data-host-column] [data-host-column-open-app]");
	check(
		`${look}: Open app opens the app picker, Browser listed as Built in`,
		isPicking === true && listsBrowser === "Built in",
		{ isPicking, listsBrowser },
	);
	await pressed(
		page,
		look === "icons" ? `[data-host-rail-tab="${wasShown}"]` : `[data-host-list-tab="${wasShown}"] button`,
	);
}

export async function checksCopiedLink(page: AskedPage, tabSelector: string): Promise<void> {
	await page.ask(STUBBED_CLIPBOARD);
	await contextPressed(page, await pointOf(page, tabSelector));
	await pressed(page, "[data-host-tab-action=copy-link]");
	await waited(100);
	const shown = await page.ask(COPIED_NOTE);
	await waited(LINK_COPIED_GONE_MS);
	const gone = await page.ask(COPIED_NOTE);
	check(
		"Copy link copies the page's address and says Link copied with a success tick, gone after 1.5 s",
		isRecord(shown) &&
			shown["said"] === "Link copied" &&
			typeof shown["copied"] === "string" &&
			shown["copied"].startsWith("https://") &&
			shown["tick"] !== shown["words"] &&
			gone === null,
		{ shown, gone },
	);
}

export async function menuDismissed(page: AskedPage): Promise<void> {
	await dismissed(page);
}

export async function menuShown(page: AskedPage, id: string): Promise<void> {
	const [x, y] = await pointOf(page, `[data-host-list-tab="${id}"]`);
	await contextPressed(page, [x, y]);
	await page.hover(x + MENU_SHOT_HOVER_PX, y + MENU_SHOT_HOVER_PX);
	await waited(150);
}

interface MenuBox {
	readonly tab: string;
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

function isMenuBox(value: unknown): value is MenuBox {
	return isRecord(value) && typeof value["left"] === "number" && typeof value["tab"] === "string";
}

function isNear(one: number, two: number): boolean {
	return Math.abs(one - two) <= POINTER_INSIDE_PX;
}

function isCornerAt(box: MenuBox, [x, y]: PagePoint): boolean {
	const hasRoomRight = x + (box.right - box.left) <= box.width - SCREEN_MARGIN_PX;
	const hasRoomBelow = y + (box.bottom - box.top) <= box.height - SCREEN_MARGIN_PX;
	const isXAt = hasRoomRight ? isNear(box.left, x) : isNear(box.right, x);
	const isYAt = hasRoomBelow ? isNear(box.top, y) : isNear(box.bottom, y);
	return isXAt && isYAt;
}

async function menuAt(page: AskedPage, point: PagePoint): Promise<MenuBox | null> {
	await contextPressed(page, point);
	const box = await page.ask(MENU_BOX);
	return isMenuBox(box) ? box : null;
}

async function dismissed(page: AskedPage): Promise<void> {
	await page.ask(ESCAPED);
	await waited(200);
}

function isInside(box: MenuBox): boolean {
	return box.left >= 0 && box.top >= 0 && box.right <= box.width && box.bottom <= box.height;
}

async function pickedFromMenu(page: AskedPage, id: string, action: string): Promise<void> {
	await contextPressed(page, await pointOf(page, `[data-host-list-tab="${id}"]`));
	await pressed(page, `[data-host-tab-action="${action}"]`);
}

async function idsListed(page: AskedPage): Promise<readonly string[]> {
	return (await listOrderOf(page)).map((row) => row.id);
}

async function renamed(page: AskedPage, id: string, typed: string, key: string): Promise<unknown> {
	await pickedFromMenu(page, id, "rename");
	const isTyped = await page.ask(
		`${TYPED_INTO}(${JSON.stringify(id)}, ${JSON.stringify(typed)}, ${JSON.stringify(key)})`,
	);
	await waited(200);
	return isTyped === true ? page.ask(`${ROW_WORDS}(${JSON.stringify(id)})`) : null;
}
