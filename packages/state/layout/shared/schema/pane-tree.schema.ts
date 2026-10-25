import { z } from "zod";

export const PaneViewSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("chat"),
		chatId: z.string().min(1).optional(),
	}),
	z.object({
		kind: z.literal("app"),
		tabId: z.string().nullable(),
	}),
]);

export type PaneView = z.infer<typeof PaneViewSchema>;

export const PaneSideSchema = z.enum(["left", "right", "top", "bottom"]);

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
	readonly chatId?: string | undefined;
}

export type PaneNode = PaneLeaf | PaneSplit;

export const PaneLeafSchema = z.object({
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
			chatId: z.string().min(1).optional(),
		}),
	]),
);

export const PaneTreeSchema = z.object({
	root: PaneNodeSchema.nullable(),
	minted: z.number().int().nonnegative(),
	targetId: z.string().nullable(),
	chatTargetId: z.string().optional(),
	shelved: z.record(z.string(), PaneNodeSchema).optional(),
});

export type PaneTree = z.infer<typeof PaneTreeSchema>;

export const PaneBoardSchema = z.object({
	root: PaneNodeSchema.nullable(),
	targetId: z.string().nullable(),
	chatTargetId: z.string().nullable(),
	tabTargetId: z.string().nullable(),
	leaves: z.array(PaneLeafSchema).readonly(),
	tabPanes: z
		.array(
			z.object({
				paneId: z.string(),
				tabId: z.string(),
			}),
		)
		.readonly(),
	chatGroups: z
		.array(
			z.object({
				chatId: z.string(),
				groupId: z.string(),
				paneIds: z.array(z.string()).readonly(),
			}),
		)
		.readonly(),
});

export type PaneBoard = z.infer<typeof PaneBoardSchema>;

export const PanePlacementSchema = z.object({
	view: PaneViewSchema,
	targetId: z.string().nullable(),
	side: PaneSideSchema,
	home: z.string().nullable().optional(),
});

export type PanePlacement = z.infer<typeof PanePlacementSchema>;

export const PlacementPreviewSchema = z.object({
	root: PaneNodeSchema.nullable(),
	placedId: z.string(),
});

export type PlacementPreview = z.infer<typeof PlacementPreviewSchema>;
