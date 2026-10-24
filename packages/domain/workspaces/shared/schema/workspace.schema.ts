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

export const KeptWorkspacesSchema = z.object({
	workspaces: z.array(WorkspaceSchema).min(1),
	currentId: z.string().min(1),
});

export type KeptWorkspaces = z.infer<typeof KeptWorkspacesSchema>;

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
