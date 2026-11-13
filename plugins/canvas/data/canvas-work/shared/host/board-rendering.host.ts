import type { Layer } from "../schema/layer.schema.js";

export interface DrawnBoard {
	readonly html: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface Shot {
	readonly png: string;
	readonly width: number;
	readonly height: number;
}

export interface BoardRendering {
	shotOf(boards: readonly DrawnBoard[], maxSide: number): Promise<Shot>;
	layersOf(html: string): readonly Layer[];
	withLayerName(html: string, path: string, name: string): string | null;
}

export interface CanvasWorkConfig {
	readonly rendering: BoardRendering;
}
