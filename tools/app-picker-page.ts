import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";

export const BOARD = {
	panelPx: 300,
	panelCornerPx: 24,
	headingPx: 40,
	searchPx: 40,
	rowPx: 40,
	discPx: 28,
	rowFont: "14px 400",
	sourceFont: "12.5px",
};
export const PLANNED = ["code", "diff", "terminal", "build", "connections", "files", "ios-viewer"];
export const OBSIDIAN_CONTROLS =
	"button { display: inline-flex; width: auto; height: 30px; padding: 4px 12px; justify-content: center; align-items: center; border-radius: 8px; white-space: nowrap; } input[type='text'] { height: 30px; padding: 4px 8px; border: 1px solid; border-radius: 4px; background: white; }";
export const DRAWN = `document.querySelector("[data-app-host-bar] [data-host-all-tabs]") !== null`;
export const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;
export const CENTER_OF = `((selector) => { const node = [...document.querySelectorAll(selector)].find((one) => one.getClientRects().length > 0); if (!node) return null; const box = node.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;
export const KEYED = `((key, target) => { const at = target === null ? document.body : document.querySelector(target); document.activeElement?.blur?.(); at.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: key !== "Escape", bubbles: true, cancelable: true })); return true; })`;
export const IS_OPEN = `document.querySelector("[data-host-app-picker]") !== null && document.querySelector("[data-host-app-picker]").getClientRects().length > 0`;
export const SEARCHED = `((said) => { const field = document.querySelector("[data-host-picker-field]"); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(field, said); field.dispatchEvent(new Event("input", { bubbles: true })); return true; })`;
export const PICKED = `(() => { const picker = document.querySelector("[data-host-app-picker]"); if (!picker) return null; const rows = [...picker.querySelectorAll("[data-host-picker-row]")]; return { heading: picker.querySelector("p")?.textContent ?? null, rows: rows.map((row) => ({ id: row.getAttribute("data-host-picker-row"), kind: row.getAttribute("data-host-picker-kind"), name: row.querySelector("[data-host-picker-name]")?.textContent ?? null, source: row.querySelector("[data-host-picker-source]")?.textContent ?? null, isDisabled: row.disabled })), lastIsBrowse: picker.lastElementChild?.matches("[data-host-picker-browse]") === true && picker.lastElementChild.previousElementSibling?.getAttribute("role") === "separator", browse: picker.querySelector("[data-host-picker-browse]")?.textContent ?? null, said: picker.textContent }; })()`;
export const METRICS = `(() => { const tall = (node) => Math.round(node.getBoundingClientRect().height * 10) / 10; const picker = document.querySelector("[data-host-app-picker]"); const panel = picker.closest(".wg-kit-pop"); const row = picker.querySelector('[data-host-picker-row="browser"]'); const disc = row.querySelector("[data-host-picker-disc]"); const font = getComputedStyle(row); const box = panel.getBoundingClientRect(); return { panelPx: Math.round(box.width), panelCornerPx: parseFloat(getComputedStyle(panel).borderTopLeftRadius), isInView: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, box: [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)], headingPx: tall(picker.querySelector("p")), searchPx: tall(picker.querySelector("[data-host-picker-search]")), rowPx: tall(row), discPx: [tall(disc), Math.round(disc.getBoundingClientRect().width)], rowFont: font.fontSize + " " + font.fontWeight, sourceFont: getComputedStyle(row.querySelector("[data-host-picker-source]")).fontSize, sourceAtEnd: row.getBoundingClientRect().right - row.querySelector("[data-host-picker-source]").getBoundingClientRect().right <= 16 }; })()`;
export const HOVER_PAINT = `((id) => { const row = document.querySelector('[data-host-picker-row="' + id + '"]'); return getComputedStyle(row, "::before").backgroundColor; })`;
export const GLASS = `(() => { const pop = [...document.querySelectorAll(".wg-kit-pop.is-open")].at(-1); if (!pop) return null; const style = getComputedStyle(pop); const alphaOf = (colour) => { const slash = colour.match(/\\/\\s*([\\d.]+)\\s*\\)$/); if (slash) return Number(slash[1]); const rgba = colour.match(/^rgba\\([^,]+,[^,]+,[^,]+,\\s*([\\d.]+)\\)$/); return rgba ? Number(rgba[1]) : 1; }; return { width: Math.round(pop.getBoundingClientRect().width), corner: parseFloat(style.borderTopLeftRadius), filter: style.backdropFilter || style.webkitBackdropFilter, fill: style.backgroundColor, alpha: alphaOf(style.backgroundColor), edge: style.boxShadow.includes("0px 0px 0px 1px") }; })()`;

export function isPoint(value: unknown): value is PagePoint {
	return Array.isArray(value) && value.length === 2 && value.every((held) => typeof held === "number");
}

export async function pointOf(page: AskedPage, selector: string): Promise<PagePoint> {
	const asked = await page.ask(`${CENTER_OF}(${JSON.stringify(selector)})`);
	if (!isPoint(asked)) throw new Error(`nothing on screen answers ${selector}`);
	return asked;
}

export async function pressed(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await pointOf(page, selector);
	await page.press(x, y);
	await waited(200);
}

export async function isOpen(page: AskedPage): Promise<boolean> {
	return (await page.ask(IS_OPEN)) === true;
}

export async function columnShown(page: AskedPage): Promise<void> {
	const hasColumn = await page.ask(`document.querySelector("[data-host-column]") !== null`);
	if (hasColumn !== true) await pressed(page, "[data-host-all-tabs]");
}

export async function opened(page: AskedPage): Promise<void> {
	await columnShown(page);
	if (!(await isOpen(page))) await pressed(page, "[data-host-column] [data-host-column-open-app]");
}

export interface PickedRow {
	readonly id: string;
	readonly kind: string;
	readonly name: string;
	readonly source: string;
	readonly isDisabled: boolean;
}

export interface Picked {
	readonly heading: string | null;
	readonly rows: readonly PickedRow[];
	readonly lastIsBrowse: boolean;
	readonly browse: string | null;
	readonly said: string;
}

export function isPicked(value: unknown): value is Picked {
	return isRecord(value) && Array.isArray(value["rows"]) && typeof value["said"] === "string";
}

export async function pickedOf(page: AskedPage): Promise<Picked> {
	const asked = await page.ask(PICKED);
	if (!isPicked(asked)) throw new Error(`the picker answered ${JSON.stringify(asked)}`);
	return asked;
}

export async function searched(page: AskedPage, said: string): Promise<Picked> {
	await page.ask(`${SEARCHED}(${JSON.stringify(said)})`);
	await waited(150);
	return pickedOf(page);
}

export function rowOf(picked: Picked, id: string): PickedRow | undefined {
	return picked.rows.find((row) => row.id === id);
}
