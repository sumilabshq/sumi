import { z } from "zod";

export const ToolsAskedSchema = z.object({
	query: z.string().min(1).max(200).describe('Words for what the tool should do, such as "open a browser page"'),
});

export const FoundToolSchema = z.object({
	name: z.string(),
	description: z.string(),
});

export type FoundTool = z.infer<typeof FoundToolSchema>;

export const FoundToolsSchema = z.object({
	tools: z.array(FoundToolSchema),
});
