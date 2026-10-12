import type { GpuSupply } from "@widgetarium/gpu";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";

export interface CanvasSource {
	readonly app: string;
	readonly design: DesignSource;
	readonly state: CanvasState;
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
}

export const CANVAS_SOURCE = "@canvas";

const NOT_BOUND = 'no design canvas is bound here: the app hands one over as sources["@canvas"]';

export function canvasSourceIn(ports: ImplementationPorts): CanvasSource {
	const held = ports.sources[CANVAS_SOURCE];
	if (!isCanvasSource(held)) throw new Error(NOT_BOUND);
	return held;
}

function isCanvasSource(held: unknown): held is CanvasSource {
	if (typeof held !== "object" || held === null) return false;
	const design: unknown = Reflect.get(held, "design");
	const state: unknown = Reflect.get(held, "state");
	return (
		typeof Reflect.get(held, "app") === "string" &&
		typeof design === "object" &&
		design !== null &&
		typeof Reflect.get(design, "design") === "function" &&
		typeof state === "object" &&
		state !== null &&
		typeof Reflect.get(state, "now") === "function"
	);
}
