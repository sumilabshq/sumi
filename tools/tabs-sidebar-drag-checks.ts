import { writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage, NativeDrag, PagePoint } from "./chrome-ask.ts";
import { centreOf } from "./tabs-sidebar-scenes.ts";

const SETTLED_MS = 450;
const BROWSER_ROW = '[data-tabs-list] > [data-tabs-item=tab][data-host-tab-app="browser"]';
const CANVAS_ROW = '[data-tabs-list] [data-tabs-item=tab]:not([data-host-tab-app="browser"])';
const TEAR_OFF_ASKED = `window.__SIDEBAR__.tearOffAsked()`;
const CARRY_HEARD = `(() => { window.__carried = []; const heard = (event) => { window.__carried.push(event.detail.phase); event.detail.isTaken = true; }; document.addEventListener("wg-carry", heard); window.__stopCarry = () => document.removeEventListener("wg-carry", heard); return true; })()`;
const CARRIED = `window.__carried.join(" ")`;
const DRAG_IMAGES_HEARD = `(() => { window.__dragImages = []; const set = DataTransfer.prototype.setDragImage; DataTransfer.prototype.setDragImage = function (image, x, y) { const box = image.getBoundingClientRect(); const caption = image.querySelector("[data-tabs-drag-image-caption]"); const words = caption?.getBoundingClientRect(); const look = caption ? getComputedStyle(caption) : null; window.__dragImages.push({ shape: image.dataset.tabsDragImage ?? "", isLaid: image.isConnected && box.width > 0, width: Math.round(box.width), height: Math.round(box.height), grab: [Math.round(x), Math.round(y)], caption: caption?.textContent ?? "", fill: look?.backgroundColor ?? "", edge: look?.borderTopWidth ?? "", inside: words !== undefined && words.left >= box.left && words.right <= box.right && words.top >= box.top + box.height / 2 && words.bottom <= box.bottom && box.bottom - words.bottom <= 12 }); return set.call(this, image, x, y); }; return true; })()`;
const LAST_DRAG_IMAGE = `window.__dragImages.at(-1) ?? null`;
const NO_TRANSFORM_LEFT = `[...document.querySelectorAll("[data-tabs-sidebar] [style*=transform]")].filter((one) => one.style.transform !== "").length === 0 && [...document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item]")].every((one) => one.style.visibility === "")`;

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

async function lifted(page: AskedPage, selector: string, to: (from: PagePoint) => PagePoint): Promise<NativeDrag> {
	const from = await centreOf(page, selector);
	const drag = await page.lift({ from, to: to(from), steps: 12, stepMs: 16 });
	check(`a press on ${selector} lifts a native drag`, drag.isLifted, from);
	return drag;
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
		const drag = await lifted(page, BROWSER_ROW, ([x, y]) => [x, y + 6]);
		await drag.drop(await centreOf(page, BROWSER_ROW));
	});
	check("a browser row dropped back in the sidebar asks no tear-off", asked === "", asked);
	check(
		"a drop in the sidebar leaves no gap, no shift and no hidden row",
		(await page.ask(NO_TRANSFORM_LEFT)) === true,
		null,
	);
}

async function checksCanvasRowOutside(page: AskedPage): Promise<void> {
	const asked = await tearOffsAfter(page, async () => {
		const drag = await lifted(page, CANVAS_ROW, ([x, y]) => [x - 200, y]);
		await drag.releaseOutside();
	});
	const image = await page.ask(LAST_DRAG_IMAGE);
	check(
		"a tab that is not a browser page drags as a plain row, never the own-window card",
		fieldOf(image, "shape") === "row" && fieldOf(image, "caption") === "" && fieldOf(image, "isLaid") === true,
		image,
	);
	check("a tab that is not a browser page released outside the window asks no tear-off", asked === "", asked);
}

function isOwnWindowCard(card: unknown): boolean {
	return (
		fieldOf(card, "shape") === "own-window" &&
		fieldOf(card, "isLaid") === true &&
		fieldOf(card, "width") === 208 &&
		fieldOf(card, "height") === 156 &&
		JSON.stringify(fieldOf(card, "grab")) === "[104,20]" &&
		fieldOf(card, "caption") === "Release to open in a new window"
	);
}

function isQuietFooter(card: unknown): boolean {
	return (
		fieldOf(card, "inside") === true && fieldOf(card, "fill") === "rgba(0, 0, 0, 0)" && fieldOf(card, "edge") === "0px"
	);
}

async function checksTearOff(page: AskedPage, folder: string): Promise<void> {
	await page.ask(`window.__carried = []; true`);
	const id = String(await page.ask(`document.querySelector('${BROWSER_ROW}')?.dataset.tabsId ?? ""`));
	const plate = await plateSpot(page);
	const asked = await tearOffsAfter(page, async () => {
		const drag = await lifted(page, BROWSER_ROW, () => plate);
		writeFileSync(path.join(folder, "own-window-drag.png"), await page.shoot());
		await drag.releaseOutside();
	});
	const card = await page.ask(LAST_DRAG_IMAGE);
	const carried = String(await page.ask(CARRIED));
	check(
		"a browser row drags as a 4:3 window card held by its title bar, saying what release does",
		isOwnWindowCard(card),
		card,
	);
	check("the card says it as quiet text in its own footer, with no plate of its own", isQuietFooter(card), card);
	check(
		"the board the row crossed hears it arrive, then hears it leave with the window, never a drop",
		carried.startsWith("over") && carried.endsWith("leave") && !carried.includes("drop"),
		carried,
	);
	check(
		"a browser row released outside the window asks the host to tear its page off, once",
		id !== "" && /^( \| )?tear off page-[\w-]+$/.test(asked),
		[asked, id],
	);
	check("a tear-off leaves no gap, no shift and no hidden row", (await page.ask(NO_TRANSFORM_LEFT)) === true, null);
}

async function checksBoardDrop(page: AskedPage): Promise<void> {
	await page.ask(`window.__carried = []; true`);
	const plate = await plateSpot(page);
	const asked = await tearOffsAfter(page, async () => {
		const drag = await lifted(page, BROWSER_ROW, () => plate);
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

async function checksTileImage(page: AskedPage): Promise<void> {
	const drag = await lifted(page, "[data-tabs-item=essential]", ([x, y]) => [x, y + 4]);
	await drag.drop(await centreOf(page, "[data-tabs-item=essential]"));
	await waited(SETTLED_MS);
	const image = await page.ask(LAST_DRAG_IMAGE);
	check(
		"an Essential drags as its tile",
		fieldOf(image, "shape") === "tile" && fieldOf(image, "isLaid") === true,
		image,
	);
}

export async function checksNativeDrag(page: AskedPage, folder: string): Promise<number> {
	await page.ask(DRAG_IMAGES_HEARD);
	await checksReleaseInSidebar(page);
	await checksCanvasRowOutside(page);
	await checksTileImage(page);
	await page.ask(CARRY_HEARD);
	await checksBoardDrop(page);
	await checksTearOff(page, folder);
	await page.ask(`window.__stopCarry(); true`);
	return failures;
}
