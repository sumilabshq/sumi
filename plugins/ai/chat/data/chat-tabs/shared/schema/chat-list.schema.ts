import { z } from "zod";

export const ChatRowMarkSchema = z.enum(["none", "running", "asking", "failed", "unread"]);

export const ChatRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	mark: ChatRowMarkSchema,
});

export type ChatRowData = z.infer<typeof ChatRowSchema>;

export const ChatListSchema = z.object({
	recents: z.array(ChatRowSchema),
});

export type ChatListData = z.infer<typeof ChatListSchema>;
