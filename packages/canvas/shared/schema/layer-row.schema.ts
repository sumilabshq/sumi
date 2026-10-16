import { z } from "zod";
import type { Layer } from "@widgetarium/behaviors";
import { LAYER_KINDS } from "./layer.schema.js";

export interface LayerRow {
	readonly id: string;
	readonly title: string;
	readonly kind: Layer["kind"];
	readonly depth: number;
	readonly repeats: number;
	readonly isPicked: boolean;
	readonly isOpen: boolean;
	readonly isHeld: boolean;
	readonly canDrag: boolean;
	readonly canHold: boolean;
	readonly scope: string;
	readonly children: readonly LayerRow[];
}

export const LayerRowSchema: z.ZodType<LayerRow> = z.object({
	id: z.string(),
	title: z.string(),
	kind: z.enum(LAYER_KINDS),
	depth: z.number(),
	repeats: z.number(),
	isPicked: z.boolean(),
	isOpen: z.boolean(),
	isHeld: z.boolean(),
	canDrag: z.boolean(),
	canHold: z.boolean(),
	scope: z.string(),
	get children() {
		return z.array(LayerRowSchema).readonly();
	},
});
