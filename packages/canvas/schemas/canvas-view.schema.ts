import { z } from "zod";

const CANVAS_MODES = ["pointer", "hand"] as const;

export const PAGE_RENDERERS = ["html", "gpu"] as const;

export const CanvasModeSchema = z.enum(CANVAS_MODES);

export const PageRendererSchema = z.enum(PAGE_RENDERERS);

export const PageAskSchema = z.object({ page: z.string() });

export const ModeAskSchema = z.object({ mode: CanvasModeSchema });

export const RendererAskSchema = z.object({ renderer: PageRendererSchema });

export const VariantsSchema = z.record(z.string(), z.string());

export const VariantPickSchema = z.object({ page: z.string(), screen: z.string() });

export const WidgetFocusSchema = z.object({ widget: z.string().nullable() });

export type CanvasMode = z.output<typeof CanvasModeSchema>;
export type PageRenderer = z.output<typeof PageRendererSchema>;
export type Variants = z.output<typeof VariantsSchema>;
