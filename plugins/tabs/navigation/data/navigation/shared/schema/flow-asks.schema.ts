import { z } from "zod";
import { FlowIconSchema, FlowLayoutSchema, FlowSchema, FlowStatusSchema, SetupSchema } from "./flows.schema.js";
import { TabEffectSchema, TabsAskSchema } from "./screen.schema.js";
import { SplitSideSchema } from "./splits.schema.js";
import { AppKindSchema, GroupHueSchema, PageAppSchema, TabMarkSchema } from "./tabs.schema.js";

export const FlowChatRowSchema = z.object({
	id: z.string(),
	title: z.string().nullable(),
	status: FlowStatusSchema.nullable(),
});

export const FlowRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: FlowIconSchema.nullable(),
	status: FlowStatusSchema.nullable(),
	chats: z.array(FlowChatRowSchema).readonly(),
	isOpen: z.boolean(),
	lastOpenedAt: z.number(),
});

export const FolderRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: FlowIconSchema.nullable(),
	color: GroupHueSchema.nullable(),
	baseDir: z.string().nullable(),
	isOpen: z.boolean(),
	status: FlowStatusSchema.nullable(),
	flows: z.array(FlowRowSchema).readonly(),
});

export const FlowsSidebarSchema = z.object({
	isConverted: z.boolean(),
	looseFlows: z.array(FlowRowSchema).readonly(),
	folders: z.array(FolderRowSchema).readonly(),
	windowFlowId: z.string().nullable(),
});

export const WindowFlowAskSchema = z.object({
	window: z.string().min(1),
});

export const FlowAskSchema = z.object({
	flowId: z.string().min(1),
});

export const FlowTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	title: z.string().nullable(),
	label: z.string().nullable(),
	address: z.string().nullable(),
	mark: TabMarkSchema,
	isChat: z.boolean(),
});

export const FlowDetailSchema = z.object({
	flow: FlowSchema,
	tabs: z.array(FlowTabSchema).readonly(),
	folderId: z.string().nullable(),
});

export const FlowPlaceSchema = z.object({
	folderId: z.string().min(1).nullable(),
	before: z.string().min(1).nullable(),
});

export const CreateFlowAskSchema = z.object({
	name: z.string().trim().min(1),
	place: FlowPlaceSchema,
});

export const OpenFlowAskSchema = WindowFlowAskSchema.extend({
	flowId: z.string().min(1),
	at: TabsAskSchema,
});

export const RenameAskSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1),
});

export const SetIconAskSchema = z.object({
	id: z.string().min(1),
	icon: FlowIconSchema.nullable(),
});

export const SetColorAskSchema = z.object({
	id: z.string().min(1),
	color: GroupHueSchema.nullable(),
});

export const MoveFlowAskSchema = FlowAskSchema.extend({
	place: FlowPlaceSchema,
});

export const RemoveFlowAskSchema = FlowAskSchema.extend({
	at: TabsAskSchema,
});

export const DuplicateFlowAskSchema = FlowAskSchema.extend({
	at: TabsAskSchema,
});

export const AdoptChatsAskSchema = z.object({
	chatIds: z.array(z.string().min(1)),
});

export const AdoptedChatsSchema = z.object({
	adoptedIds: z.array(z.string()).readonly(),
});

export const CreateFolderAskSchema = z.object({
	name: z.string().trim().min(1),
	baseDir: z.string().min(1).nullable(),
});

export const FolderAskSchema = z.object({
	id: z.string().min(1),
});

export const SetBaseDirAskSchema = FolderAskSchema.extend({
	baseDir: z.string().min(1).nullable(),
});

export const InboxRowsSchema = z.object({
	rows: z.array(FlowRowSchema).readonly(),
});

export const InboxClearedSchema = z.object({
	clearId: z.string(),
	clearedTabIds: z.array(z.string()).readonly(),
});

export const UndoClearAskSchema = z.object({
	clearId: z.string().min(1),
});

export const SetupsSchema = z.object({
	setups: z.array(SetupSchema).readonly(),
});

export const SaveSetupAskSchema = FlowAskSchema.extend({
	name: z.string().trim().min(1),
});

export const StartSetupAskSchema = z.object({
	setupId: z.string().min(1),
	place: FlowPlaceSchema,
});

export const SetupIdAskSchema = z.object({
	setupId: z.string().min(1),
});

export const FolderMadeSchema = z.object({
	folderId: z.string(),
});

export const SetupSavedSchema = z.object({
	setupId: z.string(),
});

export const FlowStartedSchema = z.object({
	flowId: z.string(),
});

export const FlowDuplicatedSchema = FlowStartedSchema.extend({
	effects: z.array(TabEffectSchema),
});

export const FlowBoardSchema = z.object({
	flowId: z.string(),
	layout: FlowLayoutSchema,
	tabs: z.array(FlowTabSchema).readonly(),
});

export const PaneFlowAskSchema = z.object({
	window: z.string().min(1),
	flowId: z.string().min(1),
});

export const FlowPaneAskSchema = PaneFlowAskSchema.extend({
	paneId: z.string().min(1),
});

export const SplitFlowPaneAskSchema = FlowPaneAskSchema.extend({
	side: SplitSideSchema,
	tabId: z.string().min(1),
});

export const ResizeFlowPaneAskSchema = PaneFlowAskSchema.extend({
	splitId: z.string().min(1),
	at: z.number().int().nonnegative(),
	share: z.number().positive(),
});

export const ShowFlowTabAskSchema = PaneFlowAskSchema.extend({
	tabId: z.string().min(1),
});

export const MoveFlowTabAskSchema = FlowPaneAskSchema.extend({
	tabId: z.string().min(1),
	before: z.string().min(1).nullable(),
});

export const OpenFlowTabAskSchema = FlowPaneAskSchema.extend({
	at: TabsAskSchema,
	app: PageAppSchema,
	address: z.string().nullable(),
});
