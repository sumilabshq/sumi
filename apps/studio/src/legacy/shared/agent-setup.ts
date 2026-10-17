import { z } from "zod";
import type { AssistantProvider } from "@widgetarium/core/engine/assistant-port.js";

export const AgentProviderSchema = z.object({
	id: z.string(),
	label: z.string(),
	canEdit: z.boolean(),
}) satisfies z.ZodType<AssistantProvider>;

export const AgentSetupSchema = z.object({
	providers: z.array(AgentProviderSchema),
	chosen: z.string(),
	helperAgents: z.boolean(),
});

export type AgentSetup = z.infer<typeof AgentSetupSchema>;

export const ProviderAskedSchema = z.object({ id: z.string() });

export const HelperAgentsAskedSchema = z.object({ on: z.boolean() });
