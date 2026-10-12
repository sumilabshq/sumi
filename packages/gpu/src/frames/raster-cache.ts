import type { Canvas, Image, Surface } from "canvaskit-wasm";
import type { FrameRoot } from "./frame-root.js";
import type { GpuContext } from "../engine/gpu-context.js";
import { colourOf } from "../style/gpu-tokens.js";

export interface DrawBudget {
	rasters: number;
	tiles: number;
	pending: boolean;
}

export interface Raster {
	readonly image: Image;
	readonly scale: number;
	readonly version: number;
}

const MAX_RASTER_SCALE = 2;
const RASTER_BUDGET_BYTES = 128 * 1024 * 1024;

export class RasterCache {
	madeTotal = 0;
	private readonly rasters = new Map<FrameRoot, Raster>();

	constructor(
		private readonly context: GpuContext,
		private readonly surfaceOf: () => Surface,
	) {}

	isCurrent(frame: FrameRoot, deviceScale: number): boolean {
		const raster = this.rasters.get(frame);
		return raster !== undefined && raster.version === frame.recordCount && raster.scale === deviceScale;
	}

	drawFrame(
		canvas: Canvas,
		frame: FrameRoot,
		at: readonly [number, number],
		deviceScale: number,
		budget: DrawBudget,
		zooming: boolean,
	): boolean {
		const raster = this.prepare(frame, deviceScale, zooming, budget);
		if (!raster) return false;
		const { ck } = this.context;
		const { image } = raster;
		const source = ck.LTRBRect(0, 0, image.width(), image.height());
		const [left, top] = at;
		if (raster.scale === deviceScale) {
			const snappedLeft = Math.round(left);
			const snappedTop = Math.round(top);
			const destination = ck.LTRBRect(
				snappedLeft,
				snappedTop,
				snappedLeft + image.width(),
				snappedTop + image.height(),
			);
			canvas.drawImageRectOptions(image, source, destination, ck.FilterMode.Nearest, ck.MipmapMode.None, null);
			return true;
		}
		const ratio = deviceScale / raster.scale;
		const destination = ck.LTRBRect(left, top, left + image.width() * ratio, top + image.height() * ratio);
		canvas.drawImageRectOptions(image, source, destination, ck.FilterMode.Linear, ck.MipmapMode.None, null);
		return true;
	}

	evictHidden(visible: ReadonlySet<FrameRoot>): void {
		if (this.bytes() <= RASTER_BUDGET_BYTES) return;
		for (const frame of [...this.rasters.keys()]) if (!visible.has(frame)) this.drop(frame);
	}

	bytes(): number {
		let bytes = 0;
		for (const { image } of this.rasters.values()) bytes += image.width() * image.height() * 4;
		return bytes;
	}

	drop(frame: FrameRoot): void {
		this.rasters.get(frame)?.image.delete();
		this.rasters.delete(frame);
	}

	dropAll(): void {
		for (const frame of [...this.rasters.keys()]) this.drop(frame);
	}

	prepare(frame: FrameRoot, deviceScale: number, zooming: boolean, budget: DrawBudget): Raster | undefined {
		const cached = this.rasters.get(frame);
		const stale = !cached || cached.version !== frame.recordCount;
		const wrongScaleAtRest = !zooming && cached?.scale !== deviceScale;
		if (!stale && !wrongScaleAtRest) return cached;
		if (budget.rasters <= 0) {
			budget.pending = true;
			return cached;
		}
		budget.rasters -= 1;
		this.rasterise(frame, zooming ? steppedScaleOf(deviceScale) : deviceScale);
		return this.rasters.get(frame);
	}

	private rasterise(frame: FrameRoot, scale: number): void {
		const { ck, tokens } = this.context;
		if (!frame.picture) return;
		const offscreen = this.surfaceOf().makeSurface({
			width: Math.max(1, Math.ceil(frame.width * scale)),
			height: Math.max(1, Math.ceil(frame.height * scale)),
			colorType: ck.ColorType.RGBA_8888,
			alphaType: ck.AlphaType.Premul,
			colorSpace: ck.ColorSpace.SRGB,
		});
		if (!offscreen) return;
		const target = offscreen.getCanvas();
		target.clear(ck.Color4f(...(colourOf(tokens, "page") ?? [1, 1, 1, 1])));
		target.scale(scale, scale);
		target.drawPicture(frame.picture);
		const image = offscreen.makeImageSnapshot();
		offscreen.delete();
		this.drop(frame);
		this.rasters.set(frame, { image, scale, version: frame.recordCount });
		this.madeTotal += 1;
	}
}

function steppedScaleOf(deviceScale: number): number {
	return Math.min(MAX_RASTER_SCALE, 2 ** Math.ceil(Math.log2(Math.max(deviceScale, 1 / 64))));
}
