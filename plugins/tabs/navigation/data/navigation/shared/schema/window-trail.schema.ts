import { z } from "zod";
import { TabsAskSchema } from "./screen.schema.js";

export const TrailStepAskSchema = z.object({
	window: z.string().min(1),
	at: TabsAskSchema,
});

export type TrailStepAsk = z.infer<typeof TrailStepAskSchema>;

export const WindowTrailStateSchema = z.object({
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
});

export type WindowTrailState = z.infer<typeof WindowTrailStateSchema>;
