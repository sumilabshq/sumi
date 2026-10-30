import { z } from "zod";

export const ChatMarkSchema = z.enum(["none", "running", "unread"]);

export type ChatMark = z.infer<typeof ChatMarkSchema>;

export const ChatRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	isPinned: z.boolean(),
	mark: ChatMarkSchema,
});

export type ChatRowData = z.infer<typeof ChatRowSchema>;

export const ChatListSchema = z.object({
	pinned: z.array(ChatRowSchema),
	recents: z.array(ChatRowSchema),
});

export type ChatListData = z.infer<typeof ChatListSchema>;

export const TabPinSchema = z.object({
	id: z.string().min(1),
	isPinned: z.boolean(),
});
