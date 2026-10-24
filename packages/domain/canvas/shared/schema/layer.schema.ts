import { z } from "zod";

export const LAYER_KINDS = ["widget", "row", "column", "grid", "group", "input", "button", "text", "picture"] as const;

export const LayerKindSchema = z.enum(LAYER_KINDS);

export type LayerKind = z.output<typeof LayerKindSchema>;

export interface CanvasLayer {
	readonly mark: string;
	readonly kind: LayerKind;
	readonly name: string;
	readonly widget?: string | undefined;
	readonly repeats: number;
	readonly isHeld: boolean;
	readonly scope: string;
	readonly children: readonly CanvasLayer[];
}

export const LayerSchema: z.ZodType<CanvasLayer> = z.lazy(() =>
	z.object({
		mark: z.string(),
		kind: LayerKindSchema,
		name: z.string(),
		widget: z.string().optional(),
		repeats: z.number(),
		isHeld: z.boolean(),
		scope: z.string(),
		children: z.array(LayerSchema).readonly(),
	}),
);

export const SeenLayersSchema = z.object({
	key: z.string(),
	layers: z.array(LayerSchema).readonly(),
});

export const LayerIdSchema = z.object({ id: z.string() });

export const LayerMoveAskSchema = z.object({
	dragged: z.string(),
	parent: z.string(),
	before: z.string().nullable(),
});
