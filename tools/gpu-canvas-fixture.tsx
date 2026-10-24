import { createElement as h } from "react";
import CanvasKitInit from "canvaskit-wasm";
import type { CanvasKit } from "canvaskit-wasm";
import type { GpuCanvas, GpuFont } from "../packages/shared/gpu/index.ts";
import { Translator } from "./gpu-fixture-translator.tsx";

export const FIXTURE_FRAME_WIDTH = 1200;

export const FIXTURE_FONTS: readonly (readonly [GpuFont["family"], string])[] = [
	["sans", "/fonts/Inter_400Regular.ttf"],
	["sans", "/fonts/Inter_500Medium.ttf"],
	["sans", "/fonts/Inter_600SemiBold.ttf"],
	["serif", "/fonts/SourceSerif4_400Regular.ttf"],
];

export function frameIdOf(index: number): string {
	return `copy-${index + 1}`;
}

export function addTranslators(gpu: GpuCanvas, copies: number): void {
	for (let index = 0; index < copies; index += 1) {
		const id = frameIdOf(index);
		gpu.addFrame({
			id,
			title: `Translator · copy ${index + 1}`,
			width: FIXTURE_FRAME_WIDTH,
			element: <Translator index={index} />,
		});
	}
}

export async function loadFixtureFonts(): Promise<GpuFont[]> {
	return Promise.all(
		FIXTURE_FONTS.map(async ([family, url]) => ({ family, data: await (await fetch(url)).arrayBuffer() })),
	);
}

export function loadFixtureCanvasKit(): Promise<CanvasKit> {
	return CanvasKitInit({ locateFile: (file) => `/${file}` });
}
