import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { TABS_SEEN } from "./studio-tabs-seen.ts";
import { isTabsSeen } from "./studio-tabs-laws.ts";
import type { TabsSeen } from "./studio-tabs-laws.ts";

const checked = { failed: 0 };
const CENTER_OF = `((selector) => { const node = [...document.querySelectorAll(selector)].find((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible"); if (!node) return null; const box = node.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;
const CONTEXT_AT = `((x, y) => { const target = document.elementFromPoint(x, y); if (!target) return false; target.dispatchEvent(new MouseEvent("contextmenu", { clientX: x, clientY: y, button: 2, bubbles: true, cancelable: true })); return true; })`;
const KEYED = `((key) => { document.activeElement?.blur?.(); document.body.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: true, bubbles: true, cancelable: true })); return true; })`;

export function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) checked.failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

export function failedChecks(): number {
	return checked.failed;
}

export async function seenOf(page: AskedPage): Promise<TabsSeen> {
	const asked = await page.ask(TABS_SEEN);
	if (!isTabsSeen(asked)) throw new Error(`the studio drew no tabs: ${JSON.stringify(asked)}`);
	return asked;
}

export async function pointOf(page: AskedPage, selector: string): Promise<PagePoint> {
	const asked = await page.ask(`${CENTER_OF}(${JSON.stringify(selector)})`);
	if (!isPoint(asked)) throw new Error(`nothing on screen answers ${selector}`);
	return asked;
}

export async function pressed(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await pointOf(page, selector);
	await page.press(x, y);
	await waited(150);
}

export async function contextPressed(page: AskedPage, [x, y]: PagePoint): Promise<void> {
	const isPressed = await page.ask(`${CONTEXT_AT}(${x}, ${y})`);
	if (isPressed !== true) throw new Error(`nothing stands at ${x}, ${y} to right-click`);
	await waited(200);
}

export async function keyed(page: AskedPage, key: string): Promise<void> {
	await page.ask(`${KEYED}(${JSON.stringify(key)})`);
	await waited(150);
}

export async function draggedEdgeBy(page: AskedPage, byPx: number): Promise<void> {
	const from = await pointOf(page, "[data-host-column-edge]");
	const to: PagePoint = [from[0] + byPx, from[1]];
	await page.drag({ from, to, steps: 10, stepMs: 16 });
	await page.release(to);
	await waited(200);
}

export async function openedTabs(page: AskedPage, count: number): Promise<void> {
	await pressed(page, "[data-host-all-tabs]");

	for (let opened = 0; opened < count; opened += 1) {
		await pressed(page, "[data-host-column] [data-host-column-open-app]");
		await pressed(page, '[data-host-new-tab="canvas"]');
	}

	await keyed(page, "\\");
}

function isPoint(value: unknown): value is PagePoint {
	return Array.isArray(value) && value.length === 2 && value.every((held) => typeof held === "number");
}
