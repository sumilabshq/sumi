import { z } from "zod";
import type { GpuSupply } from "@widgetarium/gpu";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";

export type PictureTaker = (node: HTMLElement, scale: number) => Promise<HTMLCanvasElement>;

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

export interface DrawingKit extends Drawing {
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly takesPictures: boolean;
}

export const DrawingKitSchema = z.custom<DrawingKit>(isDrawingKit);

function isDrawingKit(held: unknown): held is DrawingKit {
	if (typeof held !== "object" || held === null) return false;
	const registry: unknown = Reflect.get(held, "registry");
	return typeof registry === "object" && registry !== null && typeof Reflect.get(registry, "get") === "function";
}
