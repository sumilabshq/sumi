import type { AskedPage } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

const FOCUS_RING_PX = 2;
const MODE_SWITCHES = `[...document.querySelectorAll("[data-canvas-topbar] .wg-kit-seg")].filter((seg) => [...seg.querySelectorAll("button")].every((one) => one.textContent.trim() === "" && one.querySelector("svg"))).length`;
const FIELD_CURSOR = `getComputedStyle(document.querySelector("[data-canvas-field]")).cursor`;
const TOGGLE_INSETS = `(() => {
	const card = document.querySelector("[data-canvas-view]").getBoundingClientRect();
	const toggle = document.querySelector("[data-canvas-sidebar-toggle]").getBoundingClientRect();
	const back = [...document.querySelectorAll("[data-canvas-topbar] button")].find((one) => one.textContent.trim() === "Back to view").getBoundingClientRect();
	return { left: toggle.left - card.left, top: toggle.top - card.top, backRight: card.right - back.right };
})()`;

interface ToggleInsets {
	readonly left: number;
	readonly top: number;
	readonly backRight: number;
}

const INSET_KEYS = ["left", "top", "backRight"] as const satisfies readonly (keyof ToggleInsets)[];

export async function checkTopBar(page: AskedPage, check: Check): Promise<void> {
	const switches = await page.ask(MODE_SWITCHES);
	check("top bar: no canvas mode switch stands in it", switches === 0, switches);
	const cursor = await page.ask(FIELD_CURSOR);
	check("top bar: a canvas whose kept opening says pointer opens in hand mode", cursor === "grab", cursor);
	const insets = await toggleInsets(page);
	check(
		"top bar: the sidebar toggle and its focus ring stand inside the card, as far from its left edge as Back to view from its right",
		insets.left >= FOCUS_RING_PX && insets.top >= FOCUS_RING_PX && Math.abs(insets.left - insets.backRight) < 1,
		insets,
	);
}

async function toggleInsets(page: AskedPage): Promise<ToggleInsets> {
	const asked: unknown = await page.ask(TOGGLE_INSETS);
	if (!isInsets(asked)) {
		throw new Error(`top bar: no insets read, got ${JSON.stringify(asked)}`);
	}

	return asked;
}

function isInsets(value: unknown): value is ToggleInsets {
	return (
		typeof value === "object" &&
		value !== null &&
		INSET_KEYS.every((key) => typeof Reflect.get(value, key) === "number")
	);
}
