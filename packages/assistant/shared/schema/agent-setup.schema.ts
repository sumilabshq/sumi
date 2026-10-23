import { z } from "zod";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";

export const AttachedFilesReachSchema = z.enum(["path", "inline", "none"]);

export const ProviderReadsSchema = z.object({
	images: z.boolean(),
	files: AttachedFilesReachSchema,
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

const RenderMarkdownSchema = z.custom<RenderMarkdown>((value) => typeof value === "function");

export const AgentSetupSchema = z.object({
	isReady: z.boolean(),
	providerLabel: z.string(),
	providers: z.array(AgentProviderSchema),
	chosen: z.string(),
	helperAgents: z.boolean(),
	renderMarkdown: RenderMarkdownSchema.nullable(),
});

export type AgentSetup = z.infer<typeof AgentSetupSchema>;

export const ProviderAskedSchema = z.object({ id: z.string() });

export const HelperAgentsAskedSchema = z.object({ on: z.boolean() });
