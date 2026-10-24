import { z } from "zod";

export const WorkspaceIconSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("icon"),
		name: z.string().min(1),
	}),
	z.object({
		kind: z.literal("emoji"),
		emoji: z.string().min(1),
	}),
]);

export type WorkspaceIcon = z.infer<typeof WorkspaceIconSchema>;

export const WorkspaceSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	icon: WorkspaceIconSchema.nullable(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CurrentWorkspaceSchema = z.object({
	currentId: z.string().min(1),
	openingId: z.string().nullable(),
});

export type CurrentWorkspace = z.infer<typeof CurrentWorkspaceSchema>;

export const WorkspaceFolderSchema = z.object({
	folder: z.string().nullable(),
	isFolderFound: z.boolean(),
});

export type WorkspaceFolder = z.infer<typeof WorkspaceFolderSchema>;

export const WorkspaceIdSchema = z.object({
	id: z.string().min(1),
});

export const WorkspacePositionSchema = z.object({
	position: z.number().int().nonnegative(),
});

export const WorkspaceNameSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
});

export const WorkspaceIconChoiceSchema = z.object({
	id: z.string().min(1),
	icon: WorkspaceIconSchema.nullable(),
});

export const WorkspaceRowSchema = WorkspaceSchema.extend({
	isCurrent: z.boolean(),
	isOpening: z.boolean(),
	keyHint: z.string().nullable(),
});

export type WorkspaceRow = z.infer<typeof WorkspaceRowSchema>;

export const WorkspacesSchema = z.object({
	current: WorkspaceRowSchema,
	rows: z.array(WorkspaceRowSchema),
	isOpening: z.boolean(),
	hasStrip: z.boolean(),
});

export type WorkspacesView = z.infer<typeof WorkspacesSchema>;
