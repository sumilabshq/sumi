import { z } from "zod";

export const ChatToShowSchema = z.object({
	chatId: z.string().min(1),
	paneId: z.string().nullable(),
});

export type ChatToShow = z.infer<typeof ChatToShowSchema>;

export const NewChatTitleSchema = z.object({
	title: z.string().nullable(),
});

export const ChatPaneSchema = z.object({
	paneId: z.string().min(1),
});

export const ChatOpenedSchema = z.object({
	id: z.string(),
});
