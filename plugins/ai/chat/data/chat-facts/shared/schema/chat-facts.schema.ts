import { z } from "zod";

export const TabMarkSchema = z.enum(["none", "running", "asking", "failed", "unread"]);

export const ChatTurnSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
	isBusy: z.boolean(),
	isAsking: z.boolean(),
	isFailed: z.boolean(),
	isSeen: z.boolean(),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatTurnMarksSchema = z.object({
	was: TabMarkSchema.nullable(),
	mark: TabMarkSchema.nullable(),
});

export const SeenChatSchema = z.object({ id: z.string().min(1) });

export const NamedRecordSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
});

export type NamedRecord = z.infer<typeof NamedRecordSchema>;

export const KeepChatTabsAskSchema = z.object({
	// TODO: drop window, a chat tab belongs to the workspace now
	window: z.string().min(1).nullable().default(null),
	chats: z.array(NamedRecordSchema),
});

export const ChatTabLabelSchema = z.object({
	chatId: z.string().min(1),
	label: z.string().min(1),
});

export type ChatTabLabel = z.infer<typeof ChatTabLabelSchema>;

export const AdoptedLabelSchema = ChatTabLabelSchema.extend({
	title: z.string().min(1),
});

export type AdoptedLabel = z.infer<typeof AdoptedLabelSchema>;

export const ChatTabLabelsSchema = z.object({
	labels: z.array(ChatTabLabelSchema),
});

export const OpenChatSchema = z.object({
	id: z.string(),
	title: z.string(),
	mark: TabMarkSchema,
});

export const OpenChatsSchema = z.object({
	open: z.array(OpenChatSchema),
});

export type OpenChats = z.infer<typeof OpenChatsSchema>;
