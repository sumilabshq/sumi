import { z } from "zod";
import { SplitDirSchema } from "./splits.schema.js";
import { AppKindSchema, GroupHueSchema, TabMarkSchema } from "./tabs.schema.js";

export const FLOWS_DOC_V = 1;

export const WORKSPACE_TO_FLOWS_KEY = "workspace-to-flows-v1";

export const FlowIconSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("icon"),
		name: z.string().min(1),
	}),
	z.object({
		kind: z.literal("emoji"),
		emoji: z.string().min(1),
	}),
]);

export type FlowIcon = z.infer<typeof FlowIconSchema>;

export const FlowStatusSchema = TabMarkSchema.exclude(["none"]);

export type FlowStatus = z.infer<typeof FlowStatusSchema>;

export interface FlowPane {
	readonly kind: "pane";
	readonly id: string;
	readonly tabIds: readonly string[];
	readonly activeTabId: string | null;
}

export interface FlowSplit {
	readonly kind: "split";
	readonly id: string;
	readonly dir: z.infer<typeof SplitDirSchema>;
	readonly children: readonly FlowNode[];
	readonly shares: readonly number[];
}

export type FlowNode = FlowPane | FlowSplit;

export const FlowNodeSchema: z.ZodType<FlowNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("pane"),
			id: z.string().min(1),
			tabIds: z.array(z.string().min(1)).readonly(),
			activeTabId: z.string().min(1).nullable(),
		}),
		z.object({
			kind: z.literal("split"),
			id: z.string().min(1),
			dir: SplitDirSchema,
			children: z.array(FlowNodeSchema).readonly(),
			shares: z.array(z.number().positive()).readonly(),
		}),
	]),
);

export const FlowLayoutSchema = z.object({
	root: FlowNodeSchema,
	focusedPaneId: z.string().min(1),
	minted: z.number().int().nonnegative(),
});

export type FlowLayout = z.infer<typeof FlowLayoutSchema>;

export const GENERAL_PROJECT_ID = "general";

export const ProjectSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	baseFolder: z.string().min(1),
	isCollapsed: z.boolean().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const FlowSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	icon: FlowIconSchema.nullable(),
	layout: FlowLayoutSchema,
	createdAt: z.number().nonnegative(),
	lastOpenedAt: z.number().nonnegative(),
	archivedAt: z.number().nonnegative().nullable().default(null),
	projectId: z.string().min(1).optional(),
});

export type Flow = z.infer<typeof FlowSchema>;

export const FlowFolderSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	icon: FlowIconSchema.nullable(),
	color: GroupHueSchema.nullable().optional(),
	baseDir: z.string().min(1).nullable(),
	isOpen: z.boolean(),
	flowIds: z.array(z.string().min(1)),
	projectId: z.string().min(1).optional(),
	before: z.string().min(1).nullable().optional(),
});

export type FlowFolder = z.infer<typeof FlowFolderSchema>;

export const SetupPaneSchema = z.object({
	kind: z.literal("pane"),
	tabs: z.array(
		z.object({
			app: AppKindSchema,
			address: z.string().nullable(),
		}),
	),
});

export type SetupPane = z.infer<typeof SetupPaneSchema>;

export interface SetupSplit {
	readonly kind: "split";
	readonly dir: z.infer<typeof SplitDirSchema>;
	readonly children: readonly SetupNode[];
	readonly shares: readonly number[];
}

export type SetupNode = SetupPane | SetupSplit;

export const SetupNodeSchema: z.ZodType<SetupNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		SetupPaneSchema,
		z.object({
			kind: z.literal("split"),
			dir: SplitDirSchema,
			children: z.array(SetupNodeSchema).readonly(),
			shares: z.array(z.number().positive()).readonly(),
		}),
	]),
);

export const SetupSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	icon: FlowIconSchema.nullable(),
	root: SetupNodeSchema,
});

export type Setup = z.infer<typeof SetupSchema>;

export const InboxUndoSchema = z.object({
	clearId: z.string().min(1),
	at: z.number().nonnegative(),
	marks: z.array(
		z.object({
			tabId: z.string().min(1),
			mark: TabMarkSchema,
		}),
	),
});

export type InboxUndo = z.infer<typeof InboxUndoSchema>;

export const ViewSpotSchema = z.object({
	flowId: z.string().min(1),
	tabId: z.string().min(1),
});

export type ViewSpot = z.infer<typeof ViewSpotSchema>;

export const WindowTrailSchema = z.object({
	back: z.array(ViewSpotSchema),
	forward: z.array(ViewSpotSchema),
});

export type WindowTrail = z.infer<typeof WindowTrailSchema>;

export const ConversionSchema = z.object({
	key: z.literal(WORKSPACE_TO_FLOWS_KEY),
	sourceRev: z.number().int().nonnegative(),
	sourceDigest: z.string().min(1),
	at: z.number().nonnegative(),
});

export type Conversion = z.infer<typeof ConversionSchema>;

export const FlowsDocSchema = z.object({
	v: z.literal(FLOWS_DOC_V),
	flows: z.array(FlowSchema),
	folders: z.array(FlowFolderSchema),
	projects: z.array(ProjectSchema).optional(),
	looseFlowIds: z.array(z.string().min(1)),
	setups: z.array(SetupSchema),
	windowFlows: z.record(z.string(), z.string().min(1)),
	inboxUndo: InboxUndoSchema.nullable(),
	windowTrails: z.record(z.string(), WindowTrailSchema).optional(),
	conversion: ConversionSchema.nullable(),
});

export type FlowsDoc = z.infer<typeof FlowsDocSchema>;
