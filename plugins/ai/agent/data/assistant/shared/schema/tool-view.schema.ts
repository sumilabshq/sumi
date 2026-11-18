import { z } from "zod";

export const VIEW_SCHEME = "ui://";

export const ToolViewSchema = z.object({
	ui: z.object({
		resourceUri: z.string().startsWith(VIEW_SCHEME),
	}),
});
