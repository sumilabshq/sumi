import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

interface GridRead {
	readonly pitch: number;
	readonly offset: readonly [number, number];
	readonly corner: readonly [number, number];
}

const GRID_READ = `(() => {
	const field = document.querySelector("[data-canvas-field]");
	const style = getComputedStyle(field);
	const box = field.getBoundingClientRect();
	const pitch = parseFloat(style.backgroundSize);
	const [x, y] = style.backgroundPosition.split(" ").map(parseFloat);
	const frame = document.querySelector("[data-canvas-layer] .wg-design-frame").getBoundingClientRect();
	const wrapped = (px) => ((px % pitch) + pitch) % pitch;
	return { pitch, offset: [wrapped(frame.left - box.left - x), wrapped(frame.top - box.top - y)], corner: [frame.left, frame.top] };
})()`;
const PANNED_BY = [100, 37] as const;
const PAN = `document.querySelector("[data-canvas-field]").dispatchEvent(new WheelEvent("wheel", { deltaX: ${-PANNED_BY[0]}, deltaY: ${-PANNED_BY[1]}, cancelable: true }))`;
const ZOOMED_FROM = 0.5;
const CROWDED_SCALE = 0.25;
const LEAST_SCREEN_PITCH_PX = 8;
const WORLD_PITCH_PX = 18;
const DOUBLED_CROWDED_PITCH_PX = WORLD_PITCH_PX * CROWDED_SCALE * 2;
const SETTLED_MS = 300;
const PX_TOLERANCE = 0.5;
const RATIO_TOLERANCE = 0.03;

export async function checkGridFollowsCamera(page: AskedPage, check: Check, frameIndex: number): Promise<void> {
	await checkGridPans(page, check);
	await checkGridZooms(page, check, frameIndex);
}

async function checkGridPans(page: AskedPage, check: Check): Promise<void> {
	const before = await gridOf(page);
	await page.ask(PAN);
	await waited(SETTLED_MS);
	const after = await gridOf(page);
	check(
		"grid: a pan of (100, 37) moves the frame by as much and the dot under its corner keeps its offset",
		isPannedTogether(before, after),
		{ before, after },
	);
}

async function checkGridZooms(page: AskedPage, check: Check, frameIndex: number): Promise<void> {
	const near = await gridAtScale(page, frameIndex, ZOOMED_FROM);
	const doubled = await gridAtScale(page, frameIndex, ZOOMED_FROM * 2);
	check(
		"grid: a ×2 zoom doubles the dot pitch on screen",
		Math.abs(doubled.pitch / near.pitch - 2) <= RATIO_TOLERANCE,
		{ near: near.pitch, doubled: doubled.pitch },
	);
	const crowded = await gridAtScale(page, frameIndex, CROWDED_SCALE);
	check(
		"grid: zoomed out past 8px a dot, the pitch doubles instead of crowding",
		crowded.pitch >= LEAST_SCREEN_PITCH_PX && Math.abs(crowded.pitch - DOUBLED_CROWDED_PITCH_PX) <= PX_TOLERANCE * 2,
		{ crowded: crowded.pitch, wanted: DOUBLED_CROWDED_PITCH_PX },
	);
}

async function gridAtScale(page: AskedPage, frameIndex: number, scale: number): Promise<GridRead> {
	await page.ask(`window.designPage.lookAtFrame(${frameIndex}, ${scale})`);
	await waited(SETTLED_MS);
	return gridOf(page);
}

async function gridOf(page: AskedPage): Promise<GridRead> {
	const asked: unknown = await page.ask(GRID_READ);
	if (!isGridRead(asked)) {
		throw new Error(`grid: nothing read, got ${JSON.stringify(asked)}`);
	}

	return asked;
}

function isGridRead(value: unknown): value is GridRead {
	return typeof value === "object" && value !== null && "pitch" in value && "offset" in value && "corner" in value;
}

function isPannedTogether(before: GridRead, after: GridRead): boolean {
	const isFrameMoved =
		isNearPx(Math.abs(after.corner[0] - before.corner[0]), PANNED_BY[0]) &&
		isNearPx(Math.abs(after.corner[1] - before.corner[1]), PANNED_BY[1]);
	return (
		isFrameMoved &&
		isSameOnRing(after.offset[0], before.offset[0], after.pitch) &&
		isSameOnRing(after.offset[1], before.offset[1], after.pitch)
	);
}

function isNearPx(px: number, wanted: number): boolean {
	return Math.abs(px - wanted) <= PX_TOLERANCE;
}

function isSameOnRing(px: number, wanted: number, pitch: number): boolean {
	const apart = Math.abs(px - wanted) % pitch;
	return Math.min(apart, pitch - apart) <= PX_TOLERANCE;
}
