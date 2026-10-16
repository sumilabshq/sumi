import type { Layer } from "@widgetarium/behaviors";
import type { Camera } from "../../schema/camera.schema.js";
import type { CanvasMode, CanvasOpening, Variants } from "../../schema/canvas-view.schema.js";
import type { Selection } from "../../schema/selection.schema.js";

export interface CanvasMoment {
	readonly app: string;
	readonly page: string;
	readonly keptPage: string;
	readonly isLayersOpen: boolean;
	readonly mode: CanvasMode;
	readonly camera: Camera | null;
	readonly selection: Selection | null;
	readonly variants: Variants;
	readonly focusedWidget: string | null;
	readonly isLayoutLocked: boolean;
	readonly closedLayers: readonly string[];
	readonly seenLayers: Readonly<Record<string, readonly Layer[]>>;
}

export type CanvasField = keyof Omit<CanvasMoment, "app">;

export type MomentChange = Partial<Omit<CanvasMoment, "app">>;

export type CanvasChange = Partial<Omit<CanvasMoment, "app" | "page" | "keptPage" | "mode" | "isLayersOpen">>;

export type OpeningChange = Partial<CanvasOpening> & Pick<CanvasChange, "focusedWidget">;
