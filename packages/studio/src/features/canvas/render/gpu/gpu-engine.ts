import type { CanvasKit } from "canvaskit-wasm";
import type { Viewport } from "./camera.js";
import { CanvasView, DEFAULT_SWITCHES } from "./canvas-view.js";
import type { DrawingCanvas, GpuSwitches } from "./canvas-view.js";
import type { FamilyWord } from "./class-style.js";
import { createGpuCanvas } from "./gpu-canvas.js";
import type { GpuCanvas } from "./gpu-canvas.js";
import type { GpuContext } from "./gpu-context.js";
import type { GpuTokens } from "./gpu-tokens.js";
import { loadLayout } from "./yoga-style.js";

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
	readonly switches?: Partial<GpuSwitches> | undefined;
	readonly setCursor: (cursor: string) => void;
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
		invalidate: () => {},
	};
	const view = new CanvasView(context, start.canvas, start.viewport, { ...DEFAULT_SWITCHES, ...start.switches });
	context.invalidate = () => view.requestFrame();
	return createGpuCanvas(context, view, start.setCursor);
}
