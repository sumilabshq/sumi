import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { chatPartsOn } from "./gateways/assistant-parts/chat-parts-on.js";
import type { AgentHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";
import { AssistantCallersGuard } from "./features/chat/requests.js";

export type { AgentHosts, AssistantHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";
export type { RunnerCatalog } from "./shared/schema/runner.schema.js";
export type { Runner } from "./shared/host/runner.host.js";
export type { PromptPart } from "./shared/host/prompt-part.host.js";

export const assistant = module("assistant")
	.on(Anywhere)
	.config<AgentHosts>()
	.guard(PublicGuard)
	.guard(AssistantCallersGuard)
	.provide((facts) => chatPartsOn(facts));
