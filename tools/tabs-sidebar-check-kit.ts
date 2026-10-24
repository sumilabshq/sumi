import { waited } from "./chrome-ask.ts";
import type { AskedPage, NativeDrag, PagePoint } from "./chrome-ask.ts";
import { centreOf } from "./tabs-sidebar-scenes.ts";

export interface Measured {
	readonly ms: number | null;
	readonly commits: number;
	readonly rows: number;
	readonly tiles: number;
	readonly worstFrame: number;
}

interface Timed {
	readonly action: string;
	readonly measured: Measured;
}

export const PAINT_BUDGET_MS = 100;
export const SETTLED_MS = 450;
export const LIST_IDS = `[...document.querySelectorAll("[data-tabs-list] [data-tabs-item=tab]")].map((row) => row.dataset.tabsId)`;
export const WORKSPACE_IDS = `[...document.querySelectorAll('[data-tabs-list="workspace"] [data-tabs-item=tab]')].map((row) => row.dataset.tabsId)`;
export const CHAT_IDS = `[...document.querySelectorAll('[data-tabs-list]:not([data-tabs-list="workspace"]) [data-tabs-item=tab]')].map((row) => row.dataset.tabsId)`;
export const CHAT_TOP_IDS = `[...document.querySelectorAll('[data-tabs-list]:not([data-tabs-list="workspace"]) > [data-tabs-item=tab]')].map((row) => row.dataset.tabsId)`;
export const TILE_IDS = `[...document.querySelectorAll("[data-tabs-item=essential]")].map((tile) => tile.dataset.tabsId)`;
export const GROUP_NAMES = `[...document.querySelectorAll("[data-tabs-item=group] > span:first-of-type")].map((name) => name.textContent)`;
export const SHOWN_ID = `document.querySelector("[data-tabs-item=tab][data-shown]")?.dataset.tabsId ?? null`;
export const TITLE = `document.querySelector("[data-tabs-chat-title]")?.textContent`;

const seen = {
	failures: 0,
	timings: [] as Timed[],
};

export function failureCount(): number {
	return seen.failures;
}

export function addFailures(count: number): void {
	seen.failures += count;
}

export function recordTiming(action: string, measured: Measured): void {
	seen.timings.push({ action, measured });
}

export function printTimings(): void {
	console.log("\naction | ms to first paint | commits | rows re-rendered | tiles re-rendered");
	seen.timings.forEach(({ action, measured }) =>
		console.log(`${action} | ${measured.ms} | ${measured.commits} | ${measured.rows} | ${measured.tiles}`),
	);
}

export function check(name: string, isTrue: boolean, saw: unknown): void {
	if (!isTrue) {
		seen.failures += 1;
	}

	console.log(`${isTrue ? "ok  " : "FAIL"} ${name}${isTrue ? "" : ` — saw ${JSON.stringify(saw)}`}`);
}

export async function timed(page: AskedPage, action: string, act: () => Promise<void>): Promise<void> {
	await page.ask(`window.__arm()`);
	await act();
	await waited(SETTLED_MS);
	const measured = (await page.ask(`window.__result()`)) as Measured;
	recordTiming(action, measured);
	check(
		`${action}: first paint under ${PAINT_BUDGET_MS} ms`,
		measured.ms !== null && measured.ms < PAINT_BUDGET_MS,
		measured,
	);
}

export async function lifted(page: AskedPage, from: PagePoint, to: PagePoint, steps = 14): Promise<NativeDrag> {
	const drag = await page.lift({ from, to, steps, stepMs: 16 });

	if (!drag.isLifted) {
		check(`a press at ${from.join(",")} lifts a native drag`, false, from);
	}

	return drag;
}

export async function idsOf(page: AskedPage, expression: string): Promise<readonly string[]> {
	const said = await page.ask(expression);
	return Array.isArray(said) ? said.map(String) : [];
}

export async function pressOn(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.press(x, y);
}

export async function menuPick(page: AskedPage, label: string): Promise<void> {
	await pressOn(page, `[data-tabs-menu-item="${label}"]`);
}
