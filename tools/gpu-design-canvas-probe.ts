import { writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Region } from "./gpu-canvas-measure.ts";
import { DESIGN_FRAMES } from "./gpu-design-canvas-frames.ts";
import { frameRegionOf } from "./gpu-design-canvas-measure.ts";
import { pixelsOfPng } from "./png-pixels.ts";
import type { Pixels } from "./png-pixels.ts";

export type Check = (what: string, isOk: boolean, got: unknown) => void;

export interface DesignProbe {
	pointOf(state: string, text: string): Promise<readonly [number, number] | null>;
	regionOf(state: string): Promise<Region>;
	until(expression: string): Promise<void>;
	shot(name: string): Promise<Pixels>;
}

export const PAGES = "window.__WG_GPU_FRAMES__";
const VIEW: readonly [number, number] = [1280, 800];

export const indexOf = (state: string): number => DESIGN_FRAMES.findIndex((frame) => frame.state === state);
export const idOf = (state: string): string => `window.designPage.frameIds[${indexOf(state)}]`;

export function probeOf(page: AskedPage, shotsAt: string, check: Check): DesignProbe {
	return { pointOf, regionOf, until, shot };

	async function pointOf(state: string, text: string): Promise<readonly [number, number] | null> {
		const point: unknown = await page.ask(
			`(() => { const at = ${PAGES}.locateText(${idOf(state)}, ${JSON.stringify(text)}); const box = document.querySelector("[data-canvas-gpu]")?.getBoundingClientRect(); return at && box ? [box.left + at.x, box.top + at.y] : null; })()`,
		);
		return Array.isArray(point) ? [Number(point[0]), Number(point[1])] : null;
	}

	async function regionOf(state: string): Promise<Region> {
		return frameRegionOf(
			await page.ask(
				`(() => { const box = document.querySelectorAll("[data-canvas-layer] .wg-design-frame")[${indexOf(state)}]?.querySelector("[data-canvas-gpu-frame], [data-canvas-not-drawn]")?.getBoundingClientRect(); return box ? [box.left, box.top, box.width, box.height] : null; })()`,
			),
			VIEW,
		);
	}

	async function until(expression: string): Promise<void> {
		for (let tries = 0; tries < 300; tries += 1) {
			if ((await page.ask(`(() => { try { return ${expression}; } catch { return false; } })()`)) === true) return;
			await waited(100);
		}
		check(`waited for ${expression}`, false, await page.ask(`document.getElementById("boom")?.textContent ?? ""`));
	}

	async function shot(name: string): Promise<Pixels> {
		const png = await page.shoot();
		writeFileSync(path.join(shotsAt, `${name}.png`), png);
		return pixelsOfPng(png);
	}
}
