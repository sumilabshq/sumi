import type { Canvas } from "canvaskit-wasm";
import type { FrameRoot } from "./frame-root.js";
import type { GpuContext } from "../engine/gpu-context.js";
import type { DrawBudget, RasterCache } from "./raster-cache.js";

export interface PaintPass {
	readonly canvas: Canvas;
	readonly frames: readonly FrameRoot[];
	readonly originX: number;
	readonly originY: number;
	readonly deviceScale: number;
	readonly zooming: boolean;
	readonly budget: DrawBudget;
	readonly asRasters: boolean;
}

export function paintFrames(context: GpuContext, rasters: RasterCache, pass: PaintPass): void {
	const { ck } = context;
	const { canvas, deviceScale } = pass;
	for (const frame of pass.frames) {
		const left = frame.x * deviceScale + pass.originX;
		const top = frame.y * deviceScale + pass.originY;
		if (pass.asRasters && rasters.drawFrame(canvas, frame, [left, top], deviceScale, pass.budget, pass.zooming))
			continue;
		if (!frame.picture) continue;
		canvas.save();
		canvas.translate(left, top);
		canvas.scale(deviceScale, deviceScale);
		canvas.clipRect(ck.LTRBRect(0, 0, frame.width, frame.height), ck.ClipOp.Intersect, false);
		canvas.drawPicture(frame.picture);
		canvas.restore();
	}
}
