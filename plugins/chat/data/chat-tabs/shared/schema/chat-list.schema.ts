import { z } from "zod";

export const ChatRowMarkSchema = z.enum(["none", "running", "unread"]);

export const ChatRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	isPinned: z.boolean(),
	mark: ChatRowMarkSchema,
});

export type ChatRowData = z.infer<typeof ChatRowSchema>;

export const ChatListSchema = z.object({
	pinned: z.array(ChatRowSchema),
	recents: z.array(ChatRowSchema),
});

export type ChatListData = z.infer<typeof ChatListSchema>;
