import { readFileSync } from "node:fs";
import { COLOUR_WORDS, LENGTH_WORDS } from "../packages/studio/src/features/canvas/render/gpu/gpu-tokens.ts";
import type { Colour, Pixels } from "./png-pixels.ts";

export interface Region {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

const EDGE_STEP = 24;
const THEME_LINE = /^\s*--(color|text|radius)-([\w-]+):\s*(.+);$/;

export function lightShare(pixels: Pixels): number {
	let light = 0;
	for (let at = 0; at < pixels.rgba.length; at += 4) if (lumaAt(pixels.rgba, at) >= 250) light += 1;
	return light / (pixels.width * pixels.height);
}

export function distinctColours(pixels: Pixels): number {
	const seen = new Set<number>();
	for (let at = 0; at < pixels.rgba.length; at += 4)
		seen.add(((pixels.rgba[at] ?? 0) << 16) | ((pixels.rgba[at + 1] ?? 0) << 8) | (pixels.rgba[at + 2] ?? 0));
	return seen.size;
}

export function commonColourOnRow(pixels: Pixels, y: number, from: number, to: number): Colour {
	const counts = new Map<string, number>();
	for (let x = Math.max(0, from); x < Math.min(pixels.width, to); x += 1) {
		const at = (Math.round(y) * pixels.width + x) * 4;
		const key = `${pixels.rgba[at]},${pixels.rgba[at + 1]},${pixels.rgba[at + 2]}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const [common = "0,0,0"] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
	const [red = 0, green = 0, blue = 0] = common.split(",").map(Number);
	return [red, green, blue];
}

export function edgeSharpness(pixels: Pixels, region: Region): number {
	const steps: number[] = [];
	let [darkest, lightest] = [255, 0];
	for (let y = region.top; y < region.top + region.height; y += 1) {
		for (let x = region.left; x < region.left + region.width - 1; x += 1) {
			const at = (y * pixels.width + x) * 4;
			const luma = lumaAt(pixels.rgba, at);
			[darkest, lightest] = [Math.min(darkest, luma), Math.max(lightest, luma)];
			const step = Math.abs(luma - lumaAt(pixels.rgba, at + 4));
			if (step >= EDGE_STEP) steps.push(step);
		}
	}
	if (steps.length === 0 || lightest <= darkest) return 0;
	steps.sort((a, b) => a - b);
	return (steps[Math.floor(steps.length * 0.9)] ?? 0) / (lightest - darkest);
}

export function themeWordsMissing(): string[] {
	const missing: string[] = [];
	for (const line of readFileSync("packages/kit/theme.css", "utf8").split("\n")) {
		const [, namespace, word = "", expression = ""] = THEME_LINE.exec(line) ?? [];
		if (!namespace || word.includes("--") || expression === "initial") continue;
		const ours = namespace === "color" ? COLOUR_WORDS[word] : LENGTH_WORDS[`${namespace}-${word}`];
		if (ours !== expression) missing.push(`--${namespace}-${word}: ${expression} (gpu says ${ours ?? "nothing"})`);
	}
	return missing;
}

function lumaAt(rgba: Uint8Array, at: number): number {
	return 0.2126 * (rgba[at] ?? 0) + 0.7152 * (rgba[at + 1] ?? 0) + 0.0722 * (rgba[at + 2] ?? 0);
}
