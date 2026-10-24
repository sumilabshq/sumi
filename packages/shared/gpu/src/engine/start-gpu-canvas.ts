import type { CanvasKit } from "canvaskit-wasm";
import type { GpuSwitches } from "./canvas-view.js";
import type { GpuCanvas } from "./gpu-canvas.js";
import { startGpuEngine } from "./gpu-engine.js";
import type { GpuFont } from "./gpu-engine.js";
import type { FrameRate } from "./frame-rate.js";
import { forwardInput, viewportOf } from "../frames/page-input.js";
import { ComputedStyles } from "../style/computed-styles.js";
import { tokensOfDocument, watchTokens } from "../style/tokens-from-document.js";
import { watchStyleSheets } from "../style/watch-style-sheets.js";

export interface GpuCanvasStart {
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly fonts: readonly GpuFont[];
	readonly switches?: Partial<GpuSwitches> | undefined;
	readonly tokensFrom?: Element | undefined;
	readonly frameRate?: FrameRate | undefined;
}

export async function startGpuCanvas(canvas: HTMLCanvasElement, start: GpuCanvasStart): Promise<GpuCanvas> {
	const tokensFrom = start.tokensFrom ?? canvas.parentElement ?? canvas;
	const styles = new ComputedStyles(tokensFrom);
	const gpu = await startGpuEngine({
		canvas,
		viewport: viewportOf(canvas),
		loadCanvasKit: start.loadCanvasKit,
		fonts: start.fonts,
		tokens: tokensOfDocument(tokensFrom),
		styles,
		switches: start.switches,
		frameRate: start.frameRate,
		setCursor: (cursor) => (canvas.style.cursor = cursor),
	}).catch((failure: unknown) => {
		styles.dispose();
		throw failure;
	});
	const stopInput = forwardInput(canvas, gpu.pointer, (viewport) => gpu.resize(viewport));
	const stopTokens = watchTokens(tokensFrom, (tokens) => gpu.setTokens(tokens));
	const stopSheets = watchStyleSheets(tokensFrom.ownerDocument.head, () => gpu.restyle());
	return {
		...gpu,
		stop: () => {
			stopInput();
			stopTokens();
			stopSheets();
			gpu.stop();
			styles.dispose();
		},
	};
}
