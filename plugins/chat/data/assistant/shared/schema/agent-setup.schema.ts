import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const AttachedFilesReachSchema = z.enum(["path", "inline", "none"]);

export const ProviderReadsSchema = z.object({
	images: z.boolean(),
	files: AttachedFilesReachSchema,
	mostAttached: z.number().int().positive().optional(),
});

export type ProviderReads = z.infer<typeof ProviderReadsSchema>;

export const AgentProviderSchema = z.object({
	id: z.string(),
	label: z.string(),
	canEdit: z.boolean(),
	reads: ProviderReadsSchema,
	compacts: z.boolean(),
});

export type AgentProvider = z.infer<typeof AgentProviderSchema>;

export const AgentSetupSchema = z.object({
	isReady: z.boolean(),
	providerLabel: z.string(),
	providers: z.array(AgentProviderSchema),
	chosen: z.string(),
	helperAgents: z.boolean(),
	// TRADE-OFF: always null, so contract 0.3 apps still parse it; drop at 0.4
	renderMarkdown: z.null(),
});

export type AgentSetup = z.infer<typeof AgentSetupSchema>;

export const ProviderAskedSchema = ChatKeySchema.extend({
	id: z.string(),
});

export const HelperAgentsAskedSchema = ChatKeySchema.extend({
	on: z.boolean(),
});
