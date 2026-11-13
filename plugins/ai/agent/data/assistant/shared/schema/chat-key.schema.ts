import { z } from "zod";

export const ChatKeySchema = z.object({
	chat: z.string().min(1).max(200).nullable(),
});

export type ChatKeyed = z.infer<typeof ChatKeySchema>;

export type ChatKey = ChatKeyed["chat"];
