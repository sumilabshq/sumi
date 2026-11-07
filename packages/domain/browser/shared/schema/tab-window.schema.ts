import { z } from "zod";

export const TabWindowViewSchema = z.enum(["chat", "app"]);

export type TabWindowView = z.infer<typeof TabWindowViewSchema>;

export const TabWindowSchema = z.object({
	tabId: z.string().min(1),
	view: TabWindowViewSchema,
});
