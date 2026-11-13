import { z } from "zod";

export const McpToolSummarySchema = z.object({
	name: z.string(),
	description: z.string().nullable(),
});

export const McpServerListingSchema = z.object({
	name: z.string(),
	kind: z.literal("module"),
	tools: z.array(McpToolSummarySchema),
});

export type McpServerListing = z.infer<typeof McpServerListingSchema>;

export const McpServerListingsSchema = z.array(McpServerListingSchema);
