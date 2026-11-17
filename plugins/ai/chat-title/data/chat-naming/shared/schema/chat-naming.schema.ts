import { z } from "zod";

export const ChatRenameAskedSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1)
		.max(60)
		.describe("The new chat name: 3 to 6 words, in the language the person writes in"),
});

export const ChatRenameAnswerSchema = z.object({
	isRenamed: z.boolean(),
	said: z.string(),
});
