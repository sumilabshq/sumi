import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";

export const BOARD = {
	panelPx: 580,
	panelCornerPx: 34,
	searchPx: 48,
	rowPx: 61,
	plannedRowPx: 60,
	discPx: 44,
	nameFont: "14px 600",
	descriptionFont: "12px",
	chipPx: 24,
	addPx: 40,
};
export const PLANNED = ["code", "diff", "terminal", "build", "connections", "files", "ios-viewer"];
export const OBSIDIAN_CONTROLS =
	"button { display: inline-flex; width: auto; height: 30px; padding: 4px 12px; justify-content: center; align-items: center; border-radius: 8px; white-space: nowrap; } input[type='text'] { height: 30px; padding: 4px 8px; border: 1px solid; border-radius: 4px; background: white; }";
export const DRAWN = `document.querySelector("[data-app-host-bar] [data-host-add]") !== null`;
export const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;
export const CENTER_OF = `((selector) => { const node = [...document.querySelectorAll(selector)].find((one) => one.getClientRects().length > 0); if (!node) return null; const box = node.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;
export const KEYED = `((key, target) => { const at = target === null ? document.body : document.querySelector(target); document.activeElement?.blur?.(); at.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: key !== "Escape", bubbles: true, cancelable: true })); return true; })`;
export const IS_OPEN = `document.querySelector("[data-host-app-picker]") !== null && document.querySelector("[data-host-app-picker]").getClientRects().length > 0`;
export const SEARCHED = `((said) => { const field = document.querySelector("[data-host-picker-field]"); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(field, said); field.dispatchEvent(new Event("input", { bubbles: true })); return true; })`;
export const PICKED = `(() => { const rows = [...document.querySelectorAll("[data-host-picker-row]")]; const said = (row, part) => row.querySelector(part)?.textContent ?? null; return { groups: [...document.querySelectorAll("[data-host-picker-group]")].map((group) => group.getAttribute("data-host-picker-group")), rows: rows.map((row) => ({ id: row.getAttribute("data-host-picker-row"), kind: row.getAttribute("data-host-picker-kind"), name: said(row, "[data-host-picker-name]"), description: said(row, "[data-host-picker-description]"), chips: [...row.querySelectorAll("[data-host-picker-chip]")].map((chip) => chip.textContent), isDisabled: row.getAttribute("aria-disabled") === "true", hasAdd: row.querySelector("[data-host-new-tab]") !== null, count: Number(row.querySelector("[data-host-picker-count]")?.getAttribute("data-host-picker-count") ?? 0), isOpenDisabled: row.querySelector("[data-host-picker-open]")?.disabled ?? null })) }; })()`;
export const METRICS = `(() => { const tall = (node) => Math.round(node.getBoundingClientRect().height * 10) / 10; const panel = document.querySelector("[data-host-app-picker]").closest(".wg-kit-pop"); const row = document.querySelector('[data-host-picker-row="browser"]'); const planned = document.querySelector('[data-host-picker-row="code"]'); const name = getComputedStyle(row.querySelector("[data-host-picker-name]")); const box = panel.getBoundingClientRect(); return { panelPx: Math.round(box.width), panelCornerPx: parseFloat(getComputedStyle(panel).borderTopLeftRadius), isInView: box.left >= 0 && box.right <= innerWidth && box.top >= 0, searchPx: tall(document.querySelector("[data-host-picker-search]")), rowPx: tall(row), plannedRowPx: tall(planned), discPx: [tall(row.querySelector("[data-host-picker-disc]")), Math.round(row.querySelector("[data-host-picker-disc]").getBoundingClientRect().width)], nameFont: name.fontSize + " " + name.fontWeight, descriptionFont: getComputedStyle(row.querySelector("[data-host-picker-description]")).fontSize, chipPx: tall(row.querySelector("[data-host-picker-chip]")), addPx: tall(row.querySelector("[data-host-new-tab]")) }; })()`;
export const HOVER_PAINT = `((id) => { const row = document.querySelector('[data-host-picker-row="' + id + '"]'); const add = row.querySelector("[data-host-new-tab]"); const probe = document.createElement("span"); probe.style.color = "var(--primary)"; row.append(probe); const primary = getComputedStyle(probe).color; probe.remove(); return { row: getComputedStyle(row).backgroundColor, add: getComputedStyle(add).backgroundColor, primary }; })`;
export const TOOLTIP_OFFENDERS = `[...document.querySelectorAll("[data-host-app-picker] button, [data-host-app-picker] input")].flatMap((control) => { const name = control.getAttribute("aria-label") ?? control.textContent.trim(); const said = []; if (control.closest("[title]")) said.push(name + ": a native title"); const hasTip = control.parentElement?.matches("[data-tip]") === true; if ((hasTip || control.hasAttribute("aria-label")) && getComputedStyle(control).getPropertyValue("--no-tooltip").trim() !== "true") said.push(name + ": Obsidian tooltips its aria-label too"); return said; })`;

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

export async function opened(page: AskedPage): Promise<void> {
	if (!(await isOpen(page))) await pressed(page, "[data-app-host-bar] [data-host-add]");
}

export interface PickedRow {
	readonly id: string;
	readonly kind: string;
	readonly name: string;
	readonly description: string;
	readonly chips: readonly string[];
	readonly isDisabled: boolean;
	readonly hasAdd: boolean;
	readonly count: number;
	readonly isOpenDisabled: boolean | null;
}

export interface Picked {
	readonly groups: readonly string[];
	readonly rows: readonly PickedRow[];
}

export function isPicked(value: unknown): value is Picked {
	return isRecord(value) && Array.isArray(value["groups"]) && Array.isArray(value["rows"]);
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
