import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

interface Widths {
	readonly sidebar: number;
	readonly board: number;
	readonly edge: PagePoint;
	readonly boardMiddle: PagePoint;
}

const WIDTHS = `(() => {
	const sidebar = document.querySelector("[data-canvas-sidebar]").getBoundingClientRect();
	const board = document.querySelector("[data-canvas-board]").getBoundingClientRect();
	const edge = document.querySelector("[data-canvas-sidebar-edge]").getBoundingClientRect();
	return {
		sidebar: Math.round(sidebar.width),
		board: Math.round(board.width),
		edge: [edge.left + edge.width / 2, edge.top + edge.height / 2],
		boardMiddle: [board.left + board.width / 2, board.top + board.height / 2],
	};
})()`;
const DOUBLE_PRESS = `document.querySelector("[data-canvas-sidebar-edge]").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`;
const RELOAD = "location.reload()";
const LONG_LAYER_NAME = "A layer whose name runs far past any width the sidebar can take";
const REVEAL_SCROLL_PX = 80;
const ROW_INSIDE = `(() => {
	const sidebar = document.querySelector("[data-canvas-sidebar]");
	const row = sidebar.querySelector("[data-canvas-layers] [data-kind]");
	const name = row?.querySelector("span");
	if (!row || !name) return null;
	name.textContent = ${JSON.stringify(LONG_LAYER_NAME)};
	for (let node = row.parentElement; node && node !== sidebar; node = node.parentElement) node.scrollLeft = ${REVEAL_SCROLL_PX};
	const innerLeft = sidebar.getBoundingClientRect().left + parseFloat(getComputedStyle(sidebar).paddingLeft);
	return { rowLeft: row.getBoundingClientRect().left, nameLeft: name.getBoundingClientRect().left, innerLeft };
})()`;
const EDGE_DRAWN = `document.querySelector("[data-canvas-sidebar-edge]") !== null`;
const LAYER_LEFT = `document.querySelector("[data-canvas-layer]").getBoundingClientRect().left`;
const FPS_SAID = `document.querySelector("[data-canvas-fps]")?.textContent ?? null`;
const WIDENED_PX = 120;
const KEPT_PX = 80;
const PAN_PX = 100;
const LEAST_PX = 160;
const USUAL_PX = 200;
const BOARD_KEPT_PX = 320;
const SETTLE_TRIES = 50;
const LEFT_EDGE_X = 2;
const RIGHT_EDGE_X = 1278;

interface RowPlace {
	readonly rowLeft: number;
	readonly nameLeft: number;
	readonly innerLeft: number;
}

export async function checkLayerRowsInside(page: AskedPage, check: Check): Promise<void> {
	const places = await rowPlacesAtThreeWidths(page);
	await page.ask(DOUBLE_PRESS);
	check(
		"sidebar width: at the usual, floor and wide widths a long, scrolled layer row starts inside the plate",
		places.every(
			(place) => place !== null && place.rowLeft >= place.innerLeft - 0.5 && place.nameLeft >= place.innerLeft,
		),
		places,
	);
}

async function rowPlacesAtThreeWidths(page: AskedPage): Promise<(RowPlace | null)[]> {
	const atUsual = await rowPlaceOf(page);
	const floored = await edgeDraggedTo(page, await widthsOf(page), LEFT_EDGE_X);
	const atFloor = await rowPlaceOf(page);
	await edgeDraggedBy(page, floored, WIDENED_PX * 3);
	return [atUsual, atFloor, await rowPlaceOf(page)];
}

async function rowPlaceOf(page: AskedPage): Promise<RowPlace | null> {
	const asked: unknown = await page.ask(ROW_INSIDE);
	return isRowPlace(asked) ? asked : null;
}

function isRowPlace(value: unknown): value is RowPlace {
	return typeof value === "object" && value !== null && "rowLeft" in value && "innerLeft" in value;
}

export async function checkSidebarWidth(page: AskedPage, check: Check): Promise<void> {
	const start = await widthsOf(page);
	const wider = await edgeDraggedBy(page, start, WIDENED_PX);
	check(
		"sidebar width: a drag of +120px widens the sidebar and narrows the board by as much",
		isNear(wider.sidebar - start.sidebar, WIDENED_PX) && isNear(start.board - wider.board, WIDENED_PX),
		{ start, wider },
	);
	await checkBoardStillWorks(page, wider, check);
	await checkBounds(page, wider, check);
	await checkKeptAfterReload(page, check);
}

async function checkBoardStillWorks(page: AskedPage, wider: Widths, check: Check): Promise<void> {
	const before = Number(await page.ask(LAYER_LEFT));
	const to: PagePoint = [wider.boardMiddle[0] + PAN_PX, wider.boardMiddle[1]];
	await dragPointer(page, wider.boardMiddle, to);
	const moved = Number(await page.ask(LAYER_LEFT)) - before;
	const fps = await page.ask(FPS_SAID);
	check(
		"sidebar width: after a drag the board still pans in hand mode and counts frames",
		isNear(moved, PAN_PX) && typeof fps === "string" && fps.endsWith("FPS"),
		{ moved, fps },
	);
}

async function checkBounds(page: AskedPage, wider: Widths, check: Check): Promise<void> {
	const floored = await edgeDraggedTo(page, wider, LEFT_EDGE_X);
	check("sidebar width: it stops at its 160px floor", floored.sidebar === LEAST_PX, floored);
	const capped = await edgeDraggedTo(page, floored, RIGHT_EDGE_X);
	check("sidebar width: it stops where the board keeps 320px", isNear(capped.board, BOARD_KEPT_PX), capped);
	await page.ask(DOUBLE_PRESS);
	const reset = await settledWidths(page, (now) => now.sidebar === USUAL_PX);
	check("sidebar width: a double press on the edge returns it to 200px", reset.sidebar === USUAL_PX, reset);
}

async function checkKeptAfterReload(page: AskedPage, check: Check): Promise<void> {
	const kept = await edgeDraggedBy(page, await widthsOf(page), KEPT_PX);
	await page.ask(RELOAD);
	await settledUntil(page, EDGE_DRAWN);
	const reloaded = await settledWidths(page, (now) => now.sidebar === kept.sidebar);
	check("sidebar width: a reload opens it at the width it was left at", reloaded.sidebar === kept.sidebar, {
		kept: kept.sidebar,
		reloaded: reloaded.sidebar,
	});
	await page.ask(DOUBLE_PRESS);
}

async function edgeDraggedBy(page: AskedPage, from: Widths, px: number): Promise<Widths> {
	return edgeDraggedTo(page, from, from.edge[0] + px);
}

async function edgeDraggedTo(page: AskedPage, from: Widths, x: number): Promise<Widths> {
	await dragPointer(page, from.edge, [x, from.edge[1]]);
	return widthsOf(page);
}

async function dragPointer(page: AskedPage, from: PagePoint, to: PagePoint): Promise<void> {
	await page.drag({ from, to, steps: 8, stepMs: 16 });
	await page.release(to);
	await waited(300);
}

async function settledWidths(page: AskedPage, isSettled: (now: Widths) => boolean): Promise<Widths> {
	for (let tries = 0; tries < SETTLE_TRIES; tries += 1) {
		const now = await widthsOf(page);
		if (isSettled(now)) {
			return now;
		}

		await waited(100);
	}
	return widthsOf(page);
}

async function settledUntil(page: AskedPage, expression: string): Promise<void> {
	for (let tries = 0; tries < SETTLE_TRIES * 4; tries += 1) {
		if ((await page.ask(`(() => { try { return ${expression}; } catch { return false; } })()`)) === true) {
			return;
		}

		await waited(100);
	}
}

async function widthsOf(page: AskedPage): Promise<Widths> {
	const asked: unknown = await page.ask(WIDTHS);
	if (!isWidths(asked)) {
		throw new Error(`sidebar width: no widths read, got ${JSON.stringify(asked)}`);
	}

	return asked;
}

function isWidths(value: unknown): value is Widths {
	return typeof value === "object" && value !== null && "sidebar" in value && "board" in value && "edge" in value;
}

function isNear(px: number, wanted: number): boolean {
	return Math.abs(px - wanted) <= 1;
}
