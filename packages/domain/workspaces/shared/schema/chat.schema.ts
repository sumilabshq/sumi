import { z } from "zod";

export const TitleBySchema = z.enum(["ask", "auto", "person"]);

export type TitleBy = z.infer<typeof TitleBySchema>;

export const KeptChatSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
	titleBy: TitleBySchema.default("ask"),
	createdAt: z.number().nonnegative(),
	lastAt: z.number().nonnegative(),
	archivedAt: z.number().nonnegative().nullable().default(null),
});

export type KeptChat = z.infer<typeof KeptChatSchema>;

export const KeptChatsSchema = z.object({
	chats: z.array(KeptChatSchema),
	openOnStartId: z.string().nullable(),
});

export type KeptChats = z.infer<typeof KeptChatsSchema>;

export const ChatIdSchema = z.object({
	id: z.string().min(1),
});

export const ChatToOpenSchema = z.object({
	isRead: z.boolean(),
	id: z.string().nullable(),
});

export type ChatToOpen = z.infer<typeof ChatToOpenSchema>;

export const NewChatSchema = z.object({
	title: z.string().nullable(),
});

export const ChatTurnSchema = z.object({
	chatId: z.string().min(1),
	isBusy: z.boolean(),
	isSeen: z.boolean(),
	firstAsked: z.string().nullable(),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatRenamingSchema = z.object({
	id: z.string().min(1),
	title: z.string().trim().min(1).max(200),
	by: TitleBySchema.exclude(["ask"]),
});

export const ChatRenamedSchema = z.object({
	isRenamed: z.boolean(),
});

export const ChatRecordSchema = z.object({
	id: z.string(),
	title: z.string(),
	titleBy: TitleBySchema,
	lastAt: z.number().nonnegative(),
	isArchived: z.boolean(),
});

export const ChatArchivingSchema = z.object({
	id: z.string().min(1),
	isArchived: z.boolean(),
});

export type ChatRecord = z.infer<typeof ChatRecordSchema>;

export const ChatRecordsSchema = z.object({
	isRead: z.boolean(),
	chats: z.array(ChatRecordSchema),
});

export type ChatRecords = z.infer<typeof ChatRecordsSchema>;

export const WorkspaceCrumbSchema = z.object({
	workspace: z.string(),
});

export const ChatElsewhereRowSchema = z.object({
	workspaceId: z.string().min(1),
	workspaceName: z.string(),
	chatId: z.string().min(1),
	title: z.string(),
	lastAt: z.number().nonnegative(),
});

export type ChatElsewhereRow = z.infer<typeof ChatElsewhereRowSchema>;

export const ChatsElsewhereSchema = z.object({ rows: z.array(ChatElsewhereRowSchema) });

export const ChatElsewhereSchema = z.object({
	workspaceId: z.string().min(1),
	chatId: z.string().min(1),
});
