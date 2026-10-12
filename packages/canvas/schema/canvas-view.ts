import { z } from "zod";

export const PAGE_RENDERERS = ["html", "gpu"] as const;

export const CanvasModeSchema = z.enum(["pointer", "hand"]);

export const PageRendererSchema = z.enum(PAGE_RENDERERS);

export const CanvasOpeningSchema = z.object({ page: z.string(), isLayersOpen: z.boolean(), mode: CanvasModeSchema });

export type CanvasMode = z.output<typeof CanvasModeSchema>;
export type PageRenderer = z.output<typeof PageRendererSchema>;
export type CanvasOpening = z.output<typeof CanvasOpeningSchema>;
export type Variants = Readonly<Record<string, string>>;

export interface CanvasOpened extends CanvasOpening {
	readonly app: string;
}
