import type { Surface } from "canvaskit-wasm";
import { overlaps, visibleRectOf } from "./camera.js";
import type { Camera, Viewport } from "./camera.js";
import { FrameTitles } from "../frames/frame-titles.js";
import type { FrameRoot } from "../frames/frame-root.js";
import { paintFrames } from "../frames/frame-painter.js";
import { advanceAnimations } from "./gpu-context.js";
import type { GpuContext } from "./gpu-context.js";
import { colourOf } from "../style/gpu-tokens.js";
import type { GpuTokens, Rgba } from "../style/gpu-tokens.js";
import { RasterCache } from "../frames/raster-cache.js";
import type { DrawBudget } from "../frames/raster-cache.js";
import { TileCache } from "../frames/tile-cache.js";
import { WorkLog } from "./work-log.js";

export interface GpuSwitches {
	readonly tiles: boolean;
	readonly lod: number | false;
	readonly waitForGpu: boolean;
	readonly titles: boolean;
	readonly transparent: boolean;
	readonly pans: boolean;
}

export type DrawingCanvas = HTMLCanvasElement | OffscreenCanvas;

export const DEFAULT_SWITCHES: GpuSwitches = {
	tiles: true,
	lod: 1,
	waitForGpu: false,
	titles: true,
	transparent: false,
	pans: true,
};

const SETTLE_MS = 140;
const RASTERS_PER_DRAW = 3;
const TILES_PER_DRAW = 4;
const STAGE_FALLBACK: Rgba = [0.95, 0.95, 0.95, 1];
const STAGE_CLEAR: Rgba = [0, 0, 0, 0];

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
		this.restyle();
	}

	restyle(): void {
		this.context.styles?.clear();
		this.rasters.dropAll();
		this.tiles.dropAll();
		this.titles.dropAll();
		for (const frame of this.frames) frame.restyle();
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

	glContext(): WebGL2RenderingContext | null {
		return this.canvas.getContext("webgl2");
	}

	private draw(now: number): void {
		const { camera, viewport, context } = this;
		this.drawCount += 1;
		const canvas = this.surface.getCanvas();
		const stage = this.switches.transparent ? STAGE_CLEAR : (colourOf(context.tokens, "muted") ?? STAGE_FALLBACK);
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
		if (this.switches.titles) this.titles.draw(canvas, visible, camera);
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
