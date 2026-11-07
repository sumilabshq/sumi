import { z } from "zod";

export const ChatToShowSchema = z.object({
	chatId: z.string().min(1),
	paneId: z.string().nullable(),
});

export type ChatToShow = z.infer<typeof ChatToShowSchema>;
