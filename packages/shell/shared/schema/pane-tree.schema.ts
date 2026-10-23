import { z } from "zod";

export const PaneViewSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("chat") }),
	z.object({
		kind: z.literal("app"),
		tabId: z.string().nullable(),
	}),
]);

export type PaneView = z.infer<typeof PaneViewSchema>;

export const PaneSideSchema = z.enum(["left", "right", "top", "bottom", "center"]);

export type PaneSide = z.infer<typeof PaneSideSchema>;

export const SplitDirSchema = z.enum(["row", "column"]);

export type SplitDir = z.infer<typeof SplitDirSchema>;

export interface PaneLeaf {
	readonly kind: "pane";
	readonly id: string;
	readonly view: PaneView;
}

export interface PaneSplit {
	readonly kind: "split";
	readonly id: string;
	readonly dir: SplitDir;
	readonly children: readonly PaneNode[];
	readonly shares: readonly number[];
}

export type PaneNode = PaneLeaf | PaneSplit;

const PaneLeafSchema = z.object({
	kind: z.literal("pane"),
	id: z.string(),
	view: PaneViewSchema,
});

export const PaneNodeSchema: z.ZodType<PaneNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		PaneLeafSchema,
		z.object({
			kind: z.literal("split"),
			id: z.string(),
			dir: SplitDirSchema,
			children: z.array(PaneNodeSchema).readonly(),
			shares: z.array(z.number().nonnegative()).readonly(),
		}),
	]),
);

export const PaneTreeSchema = z.object({
	root: PaneNodeSchema.nullable(),
	minted: z.number().int().nonnegative(),
});

export type PaneTree = z.infer<typeof PaneTreeSchema>;
