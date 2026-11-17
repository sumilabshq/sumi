import { z } from "zod";
import { SplitSideSchema } from "./split.schema.js";

export const SplitDirSchema = z.enum(["row", "column"]);

export type SplitDir = z.infer<typeof SplitDirSchema>;

export type PaneSide = z.infer<typeof SplitSideSchema>;

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

// TRADE-OFF: copies of navigation's pane shapes; a generated contract imports no other package's schema
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

export const PaneBoardSchema = z.object({
	root: PaneNodeSchema.nullable(),
	targetId: z.string().nullable(),
	chatTargetId: z.string().nullable(),
	focusedChatId: z.string().nullable(),
	isLoaded: z.boolean(),
	tabTargetId: z.string().nullable(),
	leaves: z.array(PaneLeafSchema).readonly(),
	closableIds: z.array(z.string()).readonly(),
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
	elsewhere: z
		.array(
			z.object({
				window: z.string(),
				tabIds: z.array(z.string()).readonly(),
				chatIds: z.array(z.string()).readonly(),
			}),
		)
		.readonly(),
});

export type PaneBoard = z.infer<typeof PaneBoardSchema>;

export const PanePlacementSchema = z.object({
	view: PaneViewSchema,
	targetId: z.string().nullable(),
	side: SplitSideSchema,
	home: z.string().nullable().optional(),
});

export type PanePlacement = z.infer<typeof PanePlacementSchema>;

export const PlacementPreviewSchema = z.object({
	root: PaneNodeSchema.nullable(),
	placedId: z.string(),
});

export type PlacementPreview = z.infer<typeof PlacementPreviewSchema>;
