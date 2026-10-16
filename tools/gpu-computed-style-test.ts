import { paged, waited } from "./chrome-ask.ts";
import { HOST_SIZES, servedGpuPages } from "./gpu-canvas-serve.ts";
import { THEMES } from "./harness.ts";
import { pixelsOfPng } from "./png-pixels.ts";
import type { Pixels } from "./png-pixels.ts";

const VIEW: readonly [number, number] = [800, 600];
const PAGE = "window.stylePage";
const ROW_PX = 20;
const PADDING_PX = 10;
const PADDED_HALF_WIDTH_PX = 20;
const PARTS_GAP_PX = 12;
const LATE_GAP_PX = 30;
const SETTLE_MS = 600;
const KIT_TEXT_SIZES = "--wg-kit-text-s: 12px; --wg-kit-text-m: 14px;";
const VARIANT_PAD_PX = 30;
const BOX_HALF_WIDTH_PX = 20;
const BOX_WIDTH_PX = 40;
const TOGGLE_PAD_PX = 12;
const MARKED_RED = 255;
const MARKED_SAMPLE_RIGHT_PX = 22;
const TAILWIND_SHAPED_SHEET = String.raw`
:root { --spacing: 0.25rem; }
.px-3\! { padding-inline: calc(var(--spacing) * 3) !important; }
.py-1\! { padding-block: calc(var(--spacing) * 1) !important; }
.capitalize { text-transform: capitalize !important; }
.data-\[state\=on\]\:pl-\[30px\][data-state="on"] { padding-left: 30px !important; }
.aria-checked\:pl-\[30px\][aria-checked="true"] { padding-left: 30px !important; }
.group-data-\[state\=on\]\:pl-\[30px\]:is(:where(.group)[data-state="on"] *) { padding-left: 30px !important; }
.data-\[state\=on\]\:bg-\[\#ff0000\]\![data-state="on"] { background-color: #ff0000 !important; }
.marked-red { background-color: #ff0000 !important; }
`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const served = await servedGpuPages({ entry: "tools/gpu-computed-style-page.tsx", html: pageHtml() });
const page = await paged(served.origin, "gpu computed style", { size: VIEW, onGpu: true });
try {
	await started();
	await checkUnpaintedTags();
	await checkCascade();
	await checkLateSheet();
	await checkHidden();
	await checkAttributeVariants();
	await checkGroupFlip();
	await checkToggleGroup();
	await checkSelectValue();
	check(
		"the page reported no failure",
		(await page.ask(`${PAGE}.failures.length`)) === 0,
		await page.ask(`${PAGE}.failures`),
	);
} finally {
	page.close();
	served.close();
}
if (failed > 0) console.log(`${failed} check(s) failed`);
process.exit(failed > 0 ? 1 : 0);

function pageHtml(): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>.gap-parts { gap: ${PARTS_GAP_PX}px; } .gone-by-sheet { display: none; }</style>
<style data-widgetarium="tailwind-shaped">${TAILWIND_SHAPED_SHEET}</style>
<style>html, body { margin: 0; height: 100%; overflow: hidden; } #stage { position: fixed; inset: 0; display: block; width: 100vw; height: 100vh; }</style>
</head><body class="wg-root theme-light" style="${THEMES.light.replace(/\s+/g, " ")} ${HOST_SIZES} ${KIT_TEXT_SIZES}">
<canvas id="stage"></canvas>
<script src="/page.js"></script>
</body></html>`;
}

async function started(): Promise<void> {
	for (let tries = 0; tries < 300 && (await page.ask(`${PAGE}?.ready === true`)) !== true; tries += 1)
		await waited(100);
	check(
		"the GPU canvas started",
		(await page.ask(`${PAGE}?.ready === true`)) === true,
		await page.ask(`${PAGE}?.failures`),
	);
	await waited(SETTLE_MS);
}

async function checkUnpaintedTags(): Promise<void> {
	const sheet = await page.ask(`${PAGE}.textIn("never-painted")`);
	check("a <style> child paints no text", sheet === null, sheet);
	const chosen = await page.ask(`${PAGE}.textIn("label")`);
	check("a select draws its chosen option's label", chosen === (await page.ask(`${PAGE}.said.chosen`)), chosen);
}

async function checkCascade(): Promise<void> {
	const padded = await pointOf("PAD");
	check("an inline style { padding: 10 } reaches the node", padded?.[0] === PADDING_PX + PADDED_HALF_WIDTH_PX, padded);
	const gap = await distanceOf("G1", "G2");
	check("a .gap-parts rule from a stylesheet reaches the yoga node", gap === ROW_PX + PARTS_GAP_PX, gap);
}

async function checkLateSheet(): Promise<void> {
	const before = await distanceOf("L1", "L2");
	check("a class with no rule yet lays no gap", before === ROW_PX, before);
	await page.ask(`${PAGE}.wearSheet(${PAGE}.said.lateGap)`);
	await waited(SETTLE_MS);
	const after = await distanceOf("L1", "L2");
	check("a style[data-widgetarium] added later restyles the frame", after === ROW_PX + LATE_GAP_PX, after);
}

async function checkHidden(): Promise<void> {
	for (const [what, said] of [
		["a closed Radix Select's options, portalled into a detached fragment, are not drawn", "closedOption"],
		["an element carrying the hidden attribute is not drawn", "hiddenByAttribute"],
		["an element a sheet sets to display: none is not drawn", "hiddenBySheet"],
		["content portalled out of the frame is not drawn in its flow", "portalled"],
	] as const) {
		const drawn = await page.ask(`${PAGE}.textIn(${PAGE}.said.${said})`);
		check(what, drawn === null, drawn);
	}
}

async function checkAttributeVariants(): Promise<void> {
	for (const [what, text] of [
		["a data-[state=on]: variant matches the element's own data-state", "DS"],
		["an aria-checked: variant matches the element's own aria-checked", "AC"],
		["a group-data-[state=on]: variant matches an ancestor's data-state", "GD"],
	] as const) {
		const point = await pointOf(text);
		check(what, point?.[0] === VARIANT_PAD_PX + BOX_HALF_WIDTH_PX, point);
	}
}

async function checkGroupFlip(): Promise<void> {
	const before = await pointOf("GF");
	check("a group-data-[state=on]: variant stays off while the group is off", before?.[0] === BOX_HALF_WIDTH_PX, before);
	await page.ask(`${PAGE}.flipGroup()`);
	await waited(SETTLE_MS);
	const after = await pointOf("GF");
	check(
		"a group turning data-state on restyles its descendants",
		after?.[0] === VARIANT_PAD_PX + BOX_HALF_WIDTH_PX,
		after,
	);
}

type Point = readonly [number, number] | null;

async function checkToggleGroup(): Promise<void> {
	const boxesApart = xApart(await pointOf("T1"), await pointOf("T2"));
	check(
		"Radix ToggleGroup items keep px-3! on a <button>, so two items stand apart",
		boxesApart === BOX_WIDTH_PX + 2 * TOGGLE_PAD_PX,
		boxesApart,
	);
	await checkTextTogglePadding();
	const tone = await page.ask(`${PAGE}.textIn(${PAGE}.said.tone.slice(1))`);
	check("a capitalize class draws the text capitalised", tone === (await page.ask(`${PAGE}.said.toneShown`)), tone);
	await checkStatePaint();
}

async function checkTextTogglePadding(): Promise<void> {
	const toggled = xApart(await pointOf("formal"), await pointOf("casual"));
	const bare = xApart(await controlPointOf("formal"), await controlPointOf("casual"));
	const padded = toggled !== null && bare !== null ? toggled - bare : null;
	check("Radix ToggleGroup text items stand 2 × px-3! further apart than bare text", padded === 2 * TOGGLE_PAD_PX, {
		toggled,
		bare,
	});
}

async function checkStatePaint(): Promise<void> {
	const pixels = pixelsOfPng(await page.shoot());
	const plain = sampleRightOf(pixels, await pointOf("RED"));
	check("the pixel sample reads a plain .marked-red background as red", isRed(plain), plain);
	const marked = sampleRightOf(pixels, await pointOf("ON"));
	check("a Radix item's data-[state=on]:bg-[#ff0000]! paints its background", isRed(marked), marked);
}

function xApart(first: Point, second: Point): number | null {
	return first && second ? second[0] - first[0] : null;
}

function sampleRightOf(pixels: Pixels, point: Point): readonly number[] | null {
	return point ? colourAt(pixels, point[0] + MARKED_SAMPLE_RIGHT_PX, point[1]) : null;
}

function isRed(colour: readonly number[] | null): boolean {
	return colour !== null && colour[0] === MARKED_RED && colour[1] === 0 && colour[2] === 0;
}

async function checkSelectValue(): Promise<void> {
	const shown = await page.ask(`${PAGE}.textIn(${PAGE}.said.chosenLanguage)`);
	check("a closed Radix Select's trigger draws the chosen item's label", shown === "Arabic", shown);
}

function colourAt(pixels: Pixels, x: number, y: number): readonly number[] {
	const at = (Math.round(y) * pixels.width + Math.round(x)) * 4;
	return [...pixels.rgba.slice(at, at + 3)];
}

async function controlPointOf(text: string): Promise<readonly [number, number] | null> {
	const point: unknown = await page.ask(`${PAGE}.locateControl(${JSON.stringify(text)})`);
	if (typeof point !== "object" || point === null || !("x" in point) || !("y" in point)) return null;
	return [Number(point.x), Number(point.y)];
}

async function distanceOf(first: string, second: string): Promise<number | null> {
	const [above, below] = [await pointOf(first), await pointOf(second)];
	return above && below ? below[1] - above[1] : null;
}

async function pointOf(text: string): Promise<readonly [number, number] | null> {
	const point: unknown = await page.ask(`${PAGE}.locate(${JSON.stringify(text)})`);
	if (typeof point !== "object" || point === null || !("x" in point) || !("y" in point)) return null;
	return [Number(point.x), Number(point.y)];
}
