import { z } from "zod";
import type { Layer } from "@widgetarium/behaviors";

export const LAYER_KINDS = ["widget", "row", "column", "grid", "group", "input", "button", "text", "picture"] as const;

export const LayerSchema: z.ZodType<Layer> = z.object({
	mark: z.string(),
	kind: z.enum(LAYER_KINDS),
	name: z.string(),
	widget: z.string().optional(),
	repeats: z.number(),
	isHeld: z.boolean(),
	scope: z.string(),
	get children() {
		return z.array(LayerSchema).readonly();
	},
});
