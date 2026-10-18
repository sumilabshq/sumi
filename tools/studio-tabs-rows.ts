import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";

export const LIST_ORDER = `[...document.querySelectorAll("[data-host-list-tab]")].filter((row) => row.getClientRects().length > 0 && getComputedStyle(row).visibility === "visible").map((row) => { const box = row.getBoundingClientRect(); return { id: row.dataset.hostListTab, isPinned: row.dataset.hostTabPinned === "true", top: box.top, bottom: box.bottom, x: box.left + box.width / 2 }; })`;
const RAIL_ROWS = `[...document.querySelectorAll("[data-host-rail-tab]")].filter((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible").map((one) => { const box = one.getBoundingClientRect(); return { id: one.dataset.hostRailTab, isPinned: one.dataset.hostTabPinned === "true", top: box.top, bottom: box.bottom, x: box.left + box.width / 2 }; })`;
export const DROP_INSIDE_PX = 6;

export interface ListRow {
	readonly id: string;
	readonly isPinned: boolean;
	readonly top: number;
	readonly bottom: number;
	readonly x: number;
}

export async function listOrderOf(page: AskedPage): Promise<readonly ListRow[]> {
	const asked = await page.ask(LIST_ORDER);
	return Array.isArray(asked) ? asked.filter(isListRow) : [];
}

export async function draggedRow(page: AskedPage, row: ListRow, toY: number): Promise<void> {
	const from: PagePoint = [row.x, (row.top + row.bottom) / 2];
	const to: PagePoint = [row.x, toY];
	await page.drag({ from, to, steps: 12, stepMs: 16 });
	await page.release(to);
	await waited(250);
}

export async function railOrderOf(page: AskedPage): Promise<readonly ListRow[]> {
	const asked = await page.ask(RAIL_ROWS);
	return Array.isArray(asked) ? asked.filter(isListRow) : [];
}

function isListRow(value: unknown): value is ListRow {
	return isRecord(value) && typeof value["id"] === "string" && typeof value["top"] === "number";
}
