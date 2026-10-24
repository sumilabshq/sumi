import { z } from "zod";

export const AskAnswerSchema = z.enum(["site", "once", "no"]);

export type AskAnswer = z.infer<typeof AskAnswerSchema>;

export const AccessAskSchema = z.object({
	id: z.string(),
	tabId: z.string(),
	siteKey: z.string(),
	url: z.string(),
	isNavigation: z.boolean(),
});

export type AccessAsk = z.infer<typeof AccessAskSchema>;

export const AccessAsksSchema = z.array(AccessAskSchema).readonly();
