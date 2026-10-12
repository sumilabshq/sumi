import type { Canvas, Image, Surface } from "canvaskit-wasm";
import { overlaps } from "./camera.js";
import type { Camera, Viewport } from "./camera.js";
import type { FrameRoot } from "./frame-root.js";
import { paintFrames } from "./frame-painter.js";
import type { GpuContext } from "./gpu-context.js";
import type { Rgba } from "./gpu-tokens.js";
import type { DrawBudget, RasterCache } from "./raster-cache.js";

export interface TilePass {
	readonly canvas: Canvas;
	readonly visible: readonly FrameRoot[];
	readonly camera: Camera;
	readonly viewport: Viewport;
	readonly budget: DrawBudget;
	readonly asRasters: boolean;
	readonly stage: Rgba;
	readonly drawCount: number;
}

interface Tile {
	readonly image: Image;
	readonly frames: readonly FrameRoot[];
	readonly versions: readonly number[];
	usedAt: number;
}

export const TILE_PX = 512;
const MAX_TILES = 96;

export class TileCache {
	madeTotal = 0;
	private readonly tiles = new Map<string, Tile>();
	private level = 0;

	constructor(
		private readonly context: GpuContext,
		private readonly rasters: RasterCache,
		private readonly surfaceOf: () => Surface,
	) {}

	draw(pass: TilePass): void {
		const { dpr, width, height } = pass.viewport;
		const deviceScale = pass.camera.zoom * dpr;
		if (deviceScale !== this.level) {
			this.dropAll();
			this.level = deviceScale;
		}
		const originX = Math.round(pass.camera.x * dpr);
		const originY = Math.round(pass.camera.y * dpr);
		const worldTile = TILE_PX / deviceScale;
		for (
			let row = Math.floor(-originY / TILE_PX);
			row <= Math.floor((height * dpr - originY - 1) / TILE_PX);
			row += 1
		) {
			for (
				let column = Math.floor(-originX / TILE_PX);
				column <= Math.floor((width * dpr - originX - 1) / TILE_PX);
				column += 1
			) {
				const rect = {
					left: column * worldTile,
					top: row * worldTile,
					right: (column + 1) * worldTile,
					bottom: (row + 1) * worldTile,
				};
				const frames = pass.visible.filter((frame) => overlaps(frame, rect));
				const tile = this.tileAt(column, row, frames, pass);
				const at: readonly [number, number] = [column * TILE_PX + originX, row * TILE_PX + originY];
				if (tile) pass.canvas.drawImage(tile.image, at[0], at[1], null);
				else this.paintUntiled(pass, frames, at, [originX, originY]);
			}
		}
		this.evict(pass.drawCount);
	}

	bytes(): number {
		return this.tiles.size * TILE_PX * TILE_PX * 4;
	}

	dropAll(): void {
		for (const tile of this.tiles.values()) tile.image.delete();
		this.tiles.clear();
	}

	private tileAt(column: number, row: number, frames: readonly FrameRoot[], pass: TilePass): Tile | undefined {
		const key = `${column},${row}`;
		const cached = this.tiles.get(key);
		const isCurrent = cached !== undefined && sameFrames(cached, frames);
		if (cached && !isCurrent) {
			cached.image.delete();
			this.tiles.delete(key);
		}
		if (isCurrent) return Object.assign(cached, { usedAt: pass.drawCount });
		if (pass.budget.tiles <= 0) return undefined;
		pass.budget.tiles -= 1;
		const made = this.render(column, row, frames, pass);
		if (made) this.tiles.set(key, made);
		return made ?? undefined;
	}

	private render(column: number, row: number, frames: readonly FrameRoot[], pass: TilePass): Tile | null {
		const { ck } = this.context;
		const deviceScale = pass.camera.zoom * pass.viewport.dpr;
		if (pass.asRasters && !frames.every((frame) => this.rasterReady(frame, deviceScale, pass.budget))) return null;
		const offscreen = this.surfaceOf().makeSurface({
			width: TILE_PX,
			height: TILE_PX,
			colorType: ck.ColorType.RGBA_8888,
			alphaType: ck.AlphaType.Premul,
			colorSpace: ck.ColorSpace.SRGB,
		});
		if (!offscreen) return null;
		const canvas = offscreen.getCanvas();
		canvas.clear(ck.Color4f(...pass.stage));
		const noNewRasters: DrawBudget = { rasters: 0, tiles: 0, pending: false };
		const originX = -column * TILE_PX;
		const originY = -row * TILE_PX;
		paintFrames(this.context, this.rasters, {
			canvas,
			frames,
			originX,
			originY,
			deviceScale,
			zooming: false,
			budget: noNewRasters,
			asRasters: pass.asRasters,
		});
		const image = offscreen.makeImageSnapshot();
		offscreen.delete();
		this.madeTotal += 1;
		return { image, frames, versions: frames.map((frame) => frame.recordCount), usedAt: pass.drawCount };
	}

	private rasterReady(frame: FrameRoot, deviceScale: number, budget: DrawBudget): boolean {
		this.rasters.prepare(frame, deviceScale, false, budget);
		return this.rasters.isCurrent(frame, deviceScale);
	}

	private paintUntiled(
		pass: TilePass,
		frames: readonly FrameRoot[],
		at: readonly [number, number],
		origin: readonly [number, number],
	): void {
		const { ck } = this.context;
		const { canvas, budget } = pass;
		budget.pending = true;
		canvas.save();
		canvas.clipRect(ck.LTRBRect(at[0], at[1], at[0] + TILE_PX, at[1] + TILE_PX), ck.ClipOp.Intersect, false);
		const deviceScale = pass.camera.zoom * pass.viewport.dpr;
		paintFrames(this.context, this.rasters, {
			canvas,
			frames,
			originX: origin[0],
			originY: origin[1],
			deviceScale,
			zooming: false,
			budget,
			asRasters: pass.asRasters,
		});
		canvas.restore();
	}

	private evict(drawCount: number): void {
		if (this.tiles.size <= MAX_TILES) return;
		const oldest = [...this.tiles.entries()]
			.filter(([, tile]) => tile.usedAt < drawCount)
			.sort((a, b) => a[1].usedAt - b[1].usedAt);
		for (const [key, tile] of oldest.slice(0, this.tiles.size - MAX_TILES)) {
			tile.image.delete();
			this.tiles.delete(key);
		}
	}
}

function sameFrames(tile: Tile, frames: readonly FrameRoot[]): boolean {
	if (tile.frames.length !== frames.length) return false;
	return frames.every((frame, at) => tile.frames[at] === frame && tile.versions[at] === frame.recordCount);
}
