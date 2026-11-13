import { z } from "zod";

export const LayerKindSchema = z.enum(["frame", "group", "text", "picture", "control", "shape"]);

export interface Layer {
	readonly path: string;
	readonly name: string;
	readonly kind: z.infer<typeof LayerKindSchema>;
	readonly children: readonly Layer[];
}

export const LayerSchema: z.ZodType<Layer> = z.lazy(() =>
	z.object({
		path: z.string(),
		name: z.string(),
		kind: LayerKindSchema,
		children: z.array(LayerSchema).readonly(),
	}),
);
