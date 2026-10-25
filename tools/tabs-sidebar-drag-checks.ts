import { writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage, HeldDrag, PagePoint } from "./chrome-ask.ts";
import { centreOf } from "./tabs-sidebar-scenes.ts";

const SETTLED_MS = 450;
const BROWSER_ROW = '[data-tabs-list] > [data-tabs-item=tab][data-host-tab-app="browser"]';
const CANVAS_ROW = '[data-tabs-list] [data-tabs-item=tab]:not([data-host-tab-app="browser"])';
const TEAR_OFF_ASKED = `window.__SIDEBAR__.tearOffAsked()`;
const CARRY_HEARD = `(() => { window.__carried = []; const heard = (event) => { window.__carried.push(event.detail.phase); event.detail.isTaken = true; }; document.addEventListener("wg-carry", heard); window.__stopCarry = () => document.removeEventListener("wg-carry", heard); return true; })()`;
const CARRIED = `window.__carried.join(" ")`;
const GHOST_NOW = `(() => { const ghost = document.querySelector("[data-drag-ghost]"); if (ghost === null) return null; const box = ghost.getBoundingClientRect(); return { shape: ghost.dataset.dragGhost, width: Math.round(box.width), height: Math.round(box.height), words: ghost.querySelector("[data-ghost-part=words]")?.textContent.trim() ?? "", hasArt: ghost.querySelector("[data-ghost-part=head]")?.childElementCount === 2, caption: ghost.querySelector("[data-ghost-part=footer]")?.textContent.trim() ?? "", isVisible: getComputedStyle(ghost).visibility === "visible", isOverlaid: document.documentElement.dataset.ghostOverlay === "shown", title: document.querySelector('[data-tabs-item][style*="hidden"] [data-tabs-words]')?.textContent.trim() ?? "" }; })()`;
const NO_GHOST_LEFT = `document.querySelector("[data-drag-ghost]") === null`;
const NO_TRANSFORM_LEFT = `[...document.querySelectorAll("[data-tabs-sidebar] [style*=transform]")].filter((one) => one.style.transform !== "").length === 0 && [...document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item]")].every((one) => one.style.visibility === "")`;
const ROW_HEIGHT_MOST_PX = 40;
const EDGE_X = 12;
const CARD_WIDTH_PX = 208;
const CARD_HEIGHT_PX = 156;

interface Held {
	readonly drag: HeldDrag;
	readonly ghost: unknown;
}

let failures = 0;

function check(name: string, isTrue: boolean, seen: unknown): void {
	if (!isTrue) {
		failures += 1;
	}

	console.log(`${isTrue ? "ok  " : "FAIL"} ${name}${isTrue ? "" : ` — saw ${JSON.stringify(seen)}`}`);
}

function fieldOf(held: unknown, name: string): unknown {
	return typeof held === "object" && held !== null ? Reflect.get(held, name) : undefined;
}

async function lifted(page: AskedPage, selector: string, to: (from: PagePoint) => PagePoint): Promise<Held> {
	const from = await centreOf(page, selector);
	const drag = await page.lift({ from, to: to(from), steps: 12, stepMs: 16 });
	await waited(32);
	const ghost = await page.ask(GHOST_NOW);
	check(`a press on ${selector} moved past the threshold lifts a ghost`, ghost !== null, from);
	return { drag, ghost };
}

function isRowGhost(ghost: unknown): boolean {
	return (
		fieldOf(ghost, "shape") === "row" &&
		Number(fieldOf(ghost, "height")) <= ROW_HEIGHT_MOST_PX &&
		fieldOf(ghost, "hasArt") === true &&
		String(fieldOf(ghost, "words")) !== "" &&
		fieldOf(ghost, "words") === fieldOf(ghost, "title")
	);
}

function isCardGhost(ghost: unknown): boolean {
	return (
		fieldOf(ghost, "shape") === "card" &&
		fieldOf(ghost, "width") === CARD_WIDTH_PX &&
		fieldOf(ghost, "height") === CARD_HEIGHT_PX &&
		fieldOf(ghost, "words") === fieldOf(ghost, "title")
	);
}

async function tearOffsAfter(page: AskedPage, act: () => Promise<void>): Promise<string> {
	const before = String(await page.ask(TEAR_OFF_ASKED));
	await act();
	await waited(SETTLED_MS);
	return String(await page.ask(TEAR_OFF_ASKED)).slice(before.length);
}

async function plateSpot(page: AskedPage): Promise<PagePoint> {
	return centreOf(page, "[data-exact-plate]");
}

async function checksReleaseInSidebar(page: AskedPage): Promise<void> {
	const asked = await tearOffsAfter(page, async () => {
		const { drag, ghost } = await lifted(page, BROWSER_ROW, ([x, y]) => [x, y + 6]);
		check("a browser row held in the sidebar is a row, never a window card", isRowGhost(ghost), ghost);
		await drag.drop(await centreOf(page, BROWSER_ROW));
	});
	check("a browser row dropped back in the sidebar asks no tear-off", asked === "", asked);
	check("a drop takes the ghost away", (await page.ask(NO_GHOST_LEFT)) === true, null);
	check(
		"a drop in the sidebar leaves no gap, no shift and no hidden row",
		(await page.ask(NO_TRANSFORM_LEFT)) === true,
		null,
	);
}

async function checksCanvasRowOutside(page: AskedPage): Promise<void> {
	const asked = await tearOffsAfter(page, async () => {
		const { drag, ghost } = await lifted(page, CANVAS_ROW, ([x, y]) => [x - 200, y]);
		check("a tab that is not a browser page drags as a plain row", isRowGhost(ghost), ghost);
		await drag.releaseOutside();
	});
	check("a tab that is not a browser page released outside the window asks no tear-off", asked === "", asked);
}

async function checksTearOff(page: AskedPage, folder: string): Promise<void> {
	await page.ask(`window.__carried = []; true`);
	const id = String(await page.ask(`document.querySelector('${BROWSER_ROW}')?.dataset.tabsId ?? ""`));
	const plate = await plateSpot(page);
	const asked = await tearOffsAfter(page, async () => {
		const { drag, ghost } = await lifted(page, BROWSER_ROW, () => plate);
		writeFileSync(path.join(folder, "own-window-drag.png"), await page.shoot());
		check("a browser row carried over a board stays a row", isRowGhost(ghost), ghost);
		await drag.over([EDGE_X, plate[1]]);
		await waited(SETTLED_MS);
		const atEdge = await page.ask(GHOST_NOW);
		writeFileSync(path.join(folder, "own-window-edge.png"), await page.shoot());
		check(
			"a browser row carried to the window edge turns into the new-window card, its caption inside it",
			isCardGhost(atEdge) && fieldOf(atEdge, "caption") === "Drag out to open in a new window",
			atEdge,
		);
		await drag.over([-40, plate[1]]);
		await waited(SETTLED_MS);
		const outside = await page.ask(GHOST_NOW);
		check(
			"past the edge the card says a release opens a new window",
			isCardGhost(outside) && fieldOf(outside, "caption") === "Release to open in a new window",
			outside,
		);
		check(
			"a card that would cross the window edge is handed to the overlay, so the clipped in-app copy hides",
			fieldOf(outside, "isVisible") === false && fieldOf(outside, "isOverlaid") === true,
			outside,
		);
		await drag.over(plate);
		await waited(SETTLED_MS);
		const back = await page.ask(GHOST_NOW);
		check(
			"brought back inside, the card turns into a row drawn in exactly one place, in the app or in the overlay",
			isRowGhost(back) && fieldOf(back, "isVisible") !== fieldOf(back, "isOverlaid"),
			back,
		);
		await drag.releaseOutside();
	});
	const carried = String(await page.ask(CARRIED));
	check(
		"the board the row crossed hears it arrive, then hears it leave with the window, never a drop",
		carried.startsWith("over") && carried.endsWith("leave") && !carried.includes("drop"),
		carried,
	);
	check(
		"a browser row released outside the window asks the host to tear its page off, once",
		id !== "" && /^( \| )?tear off page-[\w-]+ as tab-\d+$/.test(asked),
		[asked, id],
	);
	check("a tear-off leaves no gap, no shift and no hidden row", (await page.ask(NO_TRANSFORM_LEFT)) === true, null);
}

async function checksBoardDrop(page: AskedPage): Promise<void> {
	await page.ask(`window.__carried = []; true`);
	const plate = await plateSpot(page);
	const asked = await tearOffsAfter(page, async () => {
		const { drag } = await lifted(page, BROWSER_ROW, () => plate);
		await drag.drop(plate);
	});
	const carried = String(await page.ask(CARRIED));
	check(
		"a row dropped where a board takes it is the board's drop",
		carried.startsWith("over") && carried.endsWith("drop"),
		carried,
	);
	check("a drop a board took is never also a tear-off", asked === "", asked);
	check("a board drop leaves no gap, no shift and no hidden row", (await page.ask(NO_TRANSFORM_LEFT)) === true, null);
}

async function checksHeldTabSpringsBack(page: AskedPage, folder: string): Promise<void> {
	const held = "[data-tabs-list] [data-tabs-item=tab]:has([data-tabs-own-window])";
	await page.ask(
		`(() => { const id = document.querySelector('${BROWSER_ROW}')?.dataset.tabsId; const pageId = window.__SIDEBAR__.moment()?.tabs.find((tab) => tab.id === id)?.pageId; window.__SIDEBAR__.holdElsewhere(pageId ?? ""); return pageId; })()`,
	);
	await waited(SETTLED_MS);
	const asked = await tearOffsAfter(page, async () => {
		const from = await centreOf(page, held);
		const drag = await page.lift({ from, to: [from[0] - 260, from[1] + 40], steps: 12, stepMs: 16 });
		await waited(32);
		const pulled = await page.ask(
			`(() => { const row = document.querySelector('${held}'); const moved = new DOMMatrix(getComputedStyle(row).transform); return { dx: Math.round(moved.m41), dy: Math.round(moved.m42), hint: document.querySelector("[data-tabs-held-hint]")?.textContent ?? null, ghost: document.querySelector("[data-drag-ghost]") !== null }; })()`,
		);
		writeFileSync(path.join(folder, "held-tab-pull.png"), await page.shoot());
		check(
			"a tab held by another window only stretches toward the pointer, says so, and lifts no ghost",
			Math.abs(Number(fieldOf(pulled, "dx"))) <= 24 &&
				Math.abs(Number(fieldOf(pulled, "dx"))) > 4 &&
				fieldOf(pulled, "hint") === "In another window" &&
				fieldOf(pulled, "ghost") === false,
			pulled,
		);
		await drag.releaseOutside();
	});
	await waited(SETTLED_MS);
	const rested = await page.ask(
		`(() => { const row = document.querySelector('${held}'); return { transform: row.style.transform, hint: document.querySelector("[data-tabs-held-hint]") !== null }; })()`,
	);
	check(
		"released, the held tab springs back to its place and is never torn off again",
		fieldOf(rested, "transform") === "" && fieldOf(rested, "hint") === false && asked === "",
		[rested, asked],
	);
}

async function checksTileGhost(page: AskedPage): Promise<void> {
	const { drag, ghost } = await lifted(page, "[data-tabs-item=essential]", ([x, y]) => [x, y + 6]);
	check("an Essential drags as its tile", fieldOf(ghost, "shape") === "tile", ghost);
	await drag.over(await centreOf(page, BROWSER_ROW));
	await waited(SETTLED_MS);
	const overList = await page.ask(GHOST_NOW);
	check(
		"an Essential carried over the list turns into a row before it lands",
		fieldOf(overList, "shape") === "row" && Number(fieldOf(overList, "height")) <= ROW_HEIGHT_MOST_PX,
		overList,
	);
	await drag.drop(await centreOf(page, "[data-tabs-item=essential]"));
	await waited(SETTLED_MS);
}

async function checksRowTurnsTile(page: AskedPage): Promise<void> {
	const tile = await centreOf(page, "[data-tabs-item=essential]");
	const { drag } = await lifted(page, BROWSER_ROW, () => tile);
	await waited(SETTLED_MS);
	const overTiles = await page.ask(GHOST_NOW);
	const selection = await page.ask(`getComputedStyle(document.documentElement).userSelect`);
	check(
		"a row carried over Essentials turns into a tile before it lands",
		fieldOf(overTiles, "shape") === "tile" && Number(fieldOf(overTiles, "width")) < 120,
		overTiles,
	);
	check("nothing on the page can be text-selected while a tab is held", selection === "none", selection);
	await drag.drop(await centreOf(page, BROWSER_ROW));
	await waited(SETTLED_MS);
	const after = await page.ask(`getComputedStyle(document.documentElement).userSelect`);
	check("text selection comes back after the drop", after !== "none", after);
}

async function checksPressStillShows(page: AskedPage): Promise<void> {
	const target = String(await page.ask(`document.querySelector('${CANVAS_ROW}')?.dataset.tabsId ?? ""`));
	const [x, y] = await centreOf(page, CANVAS_ROW);
	await page.press(x, y);
	await waited(SETTLED_MS);
	const shown = await page.ask(`document.querySelector("[data-tabs-item=tab][data-shown]")?.dataset.tabsId ?? null`);
	check(
		"a press with no move still shows the tab, no drag",
		shown === target && (await page.ask(NO_GHOST_LEFT)) === true,
		[shown, target],
	);
}

export async function checksPointerDrag(page: AskedPage, folder: string): Promise<number> {
	await checksPressStillShows(page);
	await checksReleaseInSidebar(page);
	await checksCanvasRowOutside(page);
	await checksTileGhost(page);
	await checksRowTurnsTile(page);
	await page.ask(CARRY_HEARD);
	await checksBoardDrop(page);
	await checksTearOff(page, folder);
	await page.ask(`window.__stopCarry(); true`);
	await checksHeldTabSpringsBack(page, folder);
	return failures;
}
