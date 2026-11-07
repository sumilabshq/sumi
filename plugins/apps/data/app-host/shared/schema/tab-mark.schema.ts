import { z } from "zod";

export const ChatMarkSchema = z.enum(["none", "running", "unread"]);

export type ChatMark = z.infer<typeof ChatMarkSchema>;

export const TabPinSchema = z.object({
	id: z.string().min(1),
	isPinned: z.boolean(),
});
