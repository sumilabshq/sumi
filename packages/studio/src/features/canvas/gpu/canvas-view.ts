import type { Surface } from "canvaskit-wasm";
import { overlaps, visibleRectOf } from "./camera.js";
import type { Camera, Viewport } from "./camera.js";
import { FRAME_GAP_PX, FrameTitles } from "./frame-titles.js";
import type { FrameRoot } from "./frame-root.js";
import { paintFrames } from "./frame-painter.js";
import { advanceAnimations } from "./gpu-context.js";
import type { GpuContext } from "./gpu-context.js";
import { colourOf } from "./gpu-tokens.js";
import type { GpuTokens, Rgba } from "./gpu-tokens.js";
import { RasterCache } from "./raster-cache.js";
import type { DrawBudget } from "./raster-cache.js";
import { TileCache } from "./tile-cache.js";
import { WorkLog } from "./work-log.js";

export interface GpuSwitches {
	readonly tiles: boolean;
	readonly lod: number | false;
	readonly waitForGpu: boolean;
}

export type DrawingCanvas = HTMLCanvasElement | OffscreenCanvas;

export const DEFAULT_SWITCHES: GpuSwitches = { tiles: true, lod: 1, waitForGpu: false };

const SETTLE_MS = 140;
const RASTERS_PER_DRAW = 3;
const TILES_PER_DRAW = 4;
const STAGE_FALLBACK: Rgba = [0.95, 0.95, 0.95, 1];

export class CanvasView {
	readonly camera: Camera = { x: 0, y: 0, zoom: 1 };
	readonly frames: FrameRoot[] = [];
	readonly work = new WorkLog();
	readonly rasters: RasterCache;
	readonly tiles: TileCache;
	private readonly titles: FrameTitles;
	private surface: Surface;
	private scheduled = false;
	private drawCount = 0;
	private lastDrawnZoom = 0;
	private zoomChangedAt = -Infinity;
	private settleTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly context: GpuContext,
		private readonly canvas: DrawingCanvas,
		public viewport: Viewport,
		readonly switches: GpuSwitches,
	) {
		this.surface = this.makeSurface();
		this.rasters = new RasterCache(context, () => this.surface);
		this.tiles = new TileCache(context, this.rasters, () => this.surface);
		this.titles = new FrameTitles(context);
	}

	resize(viewport: Viewport): void {
		this.viewport = viewport;
		this.tiles.dropAll();
		this.surface.delete();
		this.surface = this.makeSurface();
		this.requestFrame();
	}

	setTokens(tokens: GpuTokens): void {
		this.context.tokens = tokens;
		this.rasters.dropAll();
		this.tiles.dropAll();
		this.titles.dropAll();
		for (const frame of this.frames) frame.retint();
	}

	forget(frame: FrameRoot): void {
		this.rasters.drop(frame);
		this.titles.drop(frame);
		this.tiles.dropAll();
	}

	requestFrame(): void {
		if (this.scheduled) return;
		this.scheduled = true;
		requestAnimationFrame(() => {
			this.scheduled = false;
			this.renderNow();
		});
	}

	renderNow(): void {
		const started = performance.now();
		if (advanceAnimations(this.context, started)) this.requestFrame();
		for (const frame of this.frames) frame.update();
		this.draw(started);
		if (this.switches.waitForGpu) this.glContext()?.finish();
		this.work.record(performance.now() - started);
	}

	stop(): void {
		clearTimeout(this.settleTimer);
		this.rasters.dropAll();
		this.tiles.dropAll();
		this.titles.dropAll();
		this.surface.delete();
	}

	private makeSurface(): Surface {
		this.canvas.width = Math.max(1, Math.round(this.viewport.width * this.viewport.dpr));
		this.canvas.height = Math.max(1, Math.round(this.viewport.height * this.viewport.dpr));
		const surface = this.context.ck.MakeWebGLCanvasSurface(this.canvas);
		if (!surface) throw new Error("gpu canvas: WebGL refused a surface for this canvas");
		return surface;
	}

	private glContext(): WebGL2RenderingContext | null {
		return this.canvas.getContext("webgl2");
	}

	private draw(now: number): void {
		const { camera, viewport, context } = this;
		this.drawCount += 1;
		const canvas = this.surface.getCanvas();
		const stage = colourOf(context.tokens, "muted") ?? STAGE_FALLBACK;
		canvas.clear(context.ck.Color4f(...stage));
		const seen = visibleRectOf(camera, viewport);
		const visible = this.frames.filter((frame) => frame.picture && overlaps(frame, seen));
		const zooming = this.isZooming(now);
		const budget: DrawBudget = { rasters: RASTERS_PER_DRAW, tiles: TILES_PER_DRAW, pending: false };
		const deviceScale = camera.zoom * viewport.dpr;
		const { lod } = this.switches;
		const lowDetail = lod !== false && deviceScale <= lod;
		if (this.switches.tiles && !zooming) {
			this.tiles.draw({
				canvas,
				visible,
				camera,
				viewport,
				budget,
				asRasters: lowDetail,
				stage,
				drawCount: this.drawCount,
			});
		} else {
			const asRasters = lod !== false && (zooming || lowDetail);
			const [originX, originY] = [camera.x * viewport.dpr, camera.y * viewport.dpr];
			paintFrames(context, this.rasters, {
				canvas,
				frames: visible,
				originX,
				originY,
				deviceScale,
				zooming,
				budget,
				asRasters,
			});
		}
		if (budget.pending) this.requestFrame();
		this.rasters.evictHidden(new Set(visible));
		canvas.save();
		canvas.scale(viewport.dpr, viewport.dpr);
		this.titles.draw(canvas, visible, camera);
		canvas.restore();
		this.surface.flush();
	}

	private isZooming(now: number): boolean {
		if (this.camera.zoom !== this.lastDrawnZoom) {
			this.lastDrawnZoom = this.camera.zoom;
			this.zoomChangedAt = now;
			clearTimeout(this.settleTimer);
			this.settleTimer = setTimeout(() => this.requestFrame(), SETTLE_MS + 5);
		}
		return now - this.zoomChangedAt < SETTLE_MS;
	}
}

export function arrangeFrames(frames: readonly FrameRoot[]): void {
	for (const frame of frames) frame.update();
	const columns = Math.max(1, Math.ceil(Math.sqrt(frames.length * 1.6)));
	let y = 0;
	for (let start = 0; start < frames.length; start += columns) {
		const row = frames.slice(start, start + columns);
		let x = 0;
		for (const frame of row) {
			frame.x = x;
			frame.y = y;
			x += frame.width + FRAME_GAP_PX;
		}
		y += Math.max(...row.map((frame) => frame.height)) + FRAME_GAP_PX;
	}
}
