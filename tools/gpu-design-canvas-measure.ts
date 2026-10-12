import type { Region } from "./gpu-canvas-measure.ts";
import type { Colour, Pixels } from "./png-pixels.ts";

const NEAR = 6;

export function frameRegionOf(box: unknown, [width, height]: readonly [number, number]): Region {
	if (!Array.isArray(box)) return { left: 0, top: 0, width: 0, height: 0 };
	const [left = 0, top = 0, wide = 0, tall = 0] = box.map(Number);
	const right = Math.min(width, left + wide);
	const bottom = Math.min(height, top + tall);
	return {
		left: Math.max(0, Math.round(left)),
		top: Math.max(0, Math.round(top)),
		width: Math.max(0, Math.round(right - Math.max(0, left))),
		height: Math.max(0, Math.round(bottom - Math.max(0, top))),
	};
}

export function distinctColoursIn(pixels: Pixels, region: Region): number {
	const seen = new Set<number>();
	forEachPixel(pixels, region, (red, green, blue) => seen.add((red << 16) | (green << 8) | blue));
	return seen.size;
}

export function colourShareIn(pixels: Pixels, region: Region, colour: Colour): number {
	let near = 0;
	let all = 0;
	forEachPixel(pixels, region, (red, green, blue) => {
		all += 1;
		if (Math.abs(red - colour[0]) + Math.abs(green - colour[1]) + Math.abs(blue - colour[2]) <= NEAR) near += 1;
	});
	return all === 0 ? 0 : Math.round((near / all) * 1000) / 1000;
}

function forEachPixel(pixels: Pixels, region: Region, seen: (red: number, green: number, blue: number) => void): void {
	for (let y = region.top; y < region.top + region.height; y += 1)
		for (let x = region.left; x < region.left + region.width; x += 1) {
			const at = (y * pixels.width + x) * 4;
			seen(pixels.rgba[at] ?? 0, pixels.rgba[at + 1] ?? 0, pixels.rgba[at + 2] ?? 0);
		}
}
