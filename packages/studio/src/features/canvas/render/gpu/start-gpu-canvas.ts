import type { CanvasKit } from "canvaskit-wasm";
import type { GpuSwitches } from "./canvas-view.js";
import type { GpuCanvas } from "./gpu-canvas.js";
import { startGpuEngine } from "./gpu-engine.js";
import type { GpuFont } from "./gpu-engine.js";
import { forwardInput, viewportOf } from "./page-input.js";
import { tokensOfDocument, watchTokens } from "./tokens-from-document.js";

export interface GpuCanvasStart {
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly fonts: readonly GpuFont[];
	readonly switches?: Partial<GpuSwitches> | undefined;
	readonly tokensFrom?: Element | undefined;
}

export async function startGpuCanvas(canvas: HTMLCanvasElement, start: GpuCanvasStart): Promise<GpuCanvas> {
	const tokensFrom = start.tokensFrom ?? canvas.parentElement ?? canvas;
	const gpu = await startGpuEngine({
		canvas,
		viewport: viewportOf(canvas),
		loadCanvasKit: start.loadCanvasKit,
		fonts: start.fonts,
		tokens: tokensOfDocument(tokensFrom),
		switches: start.switches,
		setCursor: (cursor) => (canvas.style.cursor = cursor),
	});
	const stopInput = forwardInput(canvas, gpu.pointer, (viewport) => gpu.resize(viewport));
	const stopTokens = watchTokens(tokensFrom, (tokens) => gpu.setTokens(tokens));
	return {
		...gpu,
		stop: () => {
			stopInput();
			stopTokens();
			gpu.stop();
		},
	};
}
