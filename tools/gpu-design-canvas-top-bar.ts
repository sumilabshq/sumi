import type { AskedPage } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

const MODE_SWITCHES = `[...document.querySelectorAll("[data-plate-head] .wg-kit-seg")].filter((seg) => [...seg.querySelectorAll("button")].every((one) => one.textContent.trim() === "" && one.querySelector("svg"))).length`;
const ZONE_IN_HEAD = `document.querySelector("[data-plate-head] [data-canvas-app-zone] [data-canvas-sidebar-toggle]") !== null`;
const FIELD_CURSOR = `getComputedStyle(document.querySelector("[data-canvas-field]")).cursor`;

export async function checkTopBar(page: AskedPage, check: Check): Promise<void> {
	const isInHead = await page.ask(ZONE_IN_HEAD);
	check("top bar: the canvas's controls stand in the plate's header", isInHead === true, isInHead);
	const switches = await page.ask(MODE_SWITCHES);
	check("top bar: no canvas mode switch stands in it", switches === 0, switches);
	const cursor = await page.ask(FIELD_CURSOR);
	check("top bar: a canvas whose kept opening says pointer opens in hand mode", cursor === "grab", cursor);
}
