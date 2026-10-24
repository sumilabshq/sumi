import { z } from "zod";
import { LayerKindSchema } from "./layer.schema.js";
import type { LayerKind } from "./layer.schema.js";
import { StatePictureSchema } from "./state-picture.schema.js";

export interface LayerRow {
	readonly id: string;
	readonly title: string;
	readonly kind: LayerKind;
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

export const LayerRowSchema: z.ZodType<LayerRow> = z.lazy(() =>
	z.object({
		id: z.string(),
		title: z.string(),
		kind: LayerKindSchema,
		depth: z.number(),
		repeats: z.number(),
		isPicked: z.boolean(),
		isOpen: z.boolean(),
		isHeld: z.boolean(),
		canDrag: z.boolean(),
		canHold: z.boolean(),
		scope: z.string(),
		children: z.array(LayerRowSchema).readonly(),
	}),
);

export const LayersPanelSchema = z.object({
	isDrawn: z.boolean(),
	isShown: z.boolean(),
	isLocked: z.boolean(),
	hasPicture: z.boolean(),
	treeKey: z.string(),
	picked: z.string().nullable(),
	liveCopy: StatePictureSchema.nullable(),
	liveWidthPx: z.number(),
	rows: z.array(LayerRowSchema).readonly(),
});

export type LayersPanel = z.output<typeof LayersPanelSchema>;
