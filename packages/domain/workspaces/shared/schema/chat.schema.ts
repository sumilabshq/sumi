import { z } from "zod";

export const KeptChatSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
	isPinned: z.boolean(),
	createdAt: z.number().nonnegative(),
	lastAt: z.number().nonnegative(),
});

export type KeptChat = z.infer<typeof KeptChatSchema>;

export const KeptChatsSchema = z.object({
	chats: z.array(KeptChatSchema),
	activeId: z.string().nullable(),
});

export type KeptChats = z.infer<typeof KeptChatsSchema>;

export const ChatMarkSchema = z.enum(["none", "running", "unread"]);

export type ChatMarkKind = z.infer<typeof ChatMarkSchema>;

export const ChatMarksSchema = z.record(z.string(), ChatMarkSchema);

export type ChatMarks = z.infer<typeof ChatMarksSchema>;

export const ChatIdSchema = z.object({
	id: z.string().min(1),
});

export const ChatPinSchema = z.object({
	id: z.string().min(1),
	isPinned: z.boolean(),
});

export const ChatTitleSchema = z.object({
	id: z.string().min(1),
	title: z.string(),
});

export const ChatTurnSchema = z.object({
	chatId: z.string().min(1),
	isBusy: z.boolean(),
	firstAsked: z.string().nullable(),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	isPinned: z.boolean(),
	isActive: z.boolean(),
	mark: ChatMarkSchema,
});

export type ChatRowData = z.infer<typeof ChatRowSchema>;

export const ChatListSchema = z.object({
	pinned: z.array(ChatRowSchema),
	recents: z.array(ChatRowSchema),
});

export type ChatListData = z.infer<typeof ChatListSchema>;

export const ChatCrumbSchema = z.object({
	workspace: z.string(),
	chat: z.string(),
});

export const ActiveChatSchema = z.object({
	id: z.string(),
	title: z.string(),
});

export const ChatElsewhereRowSchema = z.object({
	workspaceId: z.string().min(1),
	workspaceName: z.string(),
	chatId: z.string().min(1),
	title: z.string(),
});

export type ChatElsewhereRow = z.infer<typeof ChatElsewhereRowSchema>;

export const ChatsElsewhereSchema = z.object({ rows: z.array(ChatElsewhereRowSchema) });

export const ChatElsewhereSchema = z.object({
	workspaceId: z.string().min(1),
	chatId: z.string().min(1),
});
