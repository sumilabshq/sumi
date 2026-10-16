import type { CanvasKit } from "canvaskit-wasm";
import type { Viewport } from "./camera.js";
import { CanvasView, DEFAULT_SWITCHES } from "./canvas-view.js";
import type { DrawingCanvas, GpuSwitches } from "./canvas-view.js";
import type { FamilyWord } from "../style/class-style.js";
import { createGpuCanvas } from "./gpu-canvas.js";
import type { GpuCanvas } from "./gpu-canvas.js";
import type { GpuContext } from "./gpu-context.js";
import type { ComputedStyles } from "../style/computed-styles.js";
import type { GpuTokens } from "../style/gpu-tokens.js";
import { loadLayout } from "../style/yoga-style.js";
import { meterFrames } from "./frame-meter.js";
import type { FrameRate } from "./frame-rate.js";

export interface GpuFont {
	readonly family: FamilyWord;
	readonly data: ArrayBuffer;
}

export interface GpuEngineStart {
	readonly canvas: DrawingCanvas;
	readonly viewport: Viewport;
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly fonts: readonly GpuFont[];
	readonly tokens: GpuTokens;
	readonly styles: ComputedStyles | null;
	readonly switches?: Partial<GpuSwitches> | undefined;
	readonly setCursor: (cursor: string) => void;
	readonly frameRate?: FrameRate | undefined;
}

export async function startGpuEngine(start: GpuEngineStart): Promise<GpuCanvas> {
	const [ck, layout] = await Promise.all([start.loadCanvasKit(), loadLayout()]);
	const fonts = ck.TypefaceFontProvider.Make();
	for (const font of start.fonts) fonts.registerFont(font.data, font.family);
	const fill = new ck.Paint();
	fill.setAntiAlias(true);
	fill.setStyle(ck.PaintStyle.Fill);
	const stroke = new ck.Paint();
	stroke.setAntiAlias(true);
	stroke.setStyle(ck.PaintStyle.Stroke);
	stroke.setStrokeCap(ck.StrokeCap.Round);
	stroke.setStrokeJoin(ck.StrokeJoin.Round);
	const context: GpuContext = {
		ck,
		fonts,
		fill,
		stroke,
		...layout,
		animating: new Set(),
		tokens: start.tokens,
		styles: start.styles,
		invalidate: () => {},
	};
	const view = new CanvasView(context, start.canvas, start.viewport, { ...DEFAULT_SWITCHES, ...start.switches });
	context.invalidate = () => view.requestFrame();
	const gpu = createGpuCanvas(context, view, start.setCursor);
	return start.frameRate ? withMeter(gpu, view, start.frameRate) : gpu;
}

function withMeter(gpu: GpuCanvas, view: CanvasView, frameRate: FrameRate): GpuCanvas {
	const stopMeter = meterFrames(frameRate, { gl: () => view.glContext(), render: () => view.renderNow() });
	return {
		...gpu,
		stop: () => {
			stopMeter();
			gpu.stop();
		},
	};
}
