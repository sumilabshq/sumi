import { z } from "zod";

export const ChatMarkSchema = z.enum(["none", "running", "unread"]);

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

export const ChatPinSchema = z.object({
	id: z.string().min(1),
	isPinned: z.boolean(),
});

export const ChatPlaceSchema = z.object({
	id: z.string().min(1),
	to: z.discriminatedUnion("list", [
		z.object({
			list: z.literal("pinned"),
			before: z.string().min(1).nullable(),
		}),
		z.object({ list: z.literal("recents") }),
	]),
});

export type ChatPlace = z.infer<typeof ChatPlaceSchema>;
