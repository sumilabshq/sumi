import { z } from "zod";

export const SessionRowSchema = z.object({
	chatId: z.string().min(1),
	title: z.string(),
	lastAt: z.number().nonnegative(),
	workspaceId: z.string().min(1).nullable(),
	workspaceName: z.string().nullable(),
});

export type SessionRow = z.infer<typeof SessionRowSchema>;

export const SessionPageAskSchema = z.object({
	text: z.string(),
	limit: z.number().int().positive(),
	isArchived: z.boolean(),
});

export type SessionPageAsk = z.infer<typeof SessionPageAskSchema>;

export const SessionPageSchema = z.object({
	isRead: z.boolean(),
	rows: z.array(SessionRowSchema),
	hasMore: z.boolean(),
	archivedCount: z.number().int().nonnegative(),
});

export type SessionPage = z.infer<typeof SessionPageSchema>;

export const SessionToOpenSchema = z.object({
	chatId: z.string().min(1),
	workspaceId: z.string().min(1).nullable(),
});

export const SessionArchivingSchema = z.object({
	chatId: z.string().min(1),
	isArchived: z.boolean(),
});

export const SessionToDeleteSchema = z.object({
	chatId: z.string().min(1),
});
