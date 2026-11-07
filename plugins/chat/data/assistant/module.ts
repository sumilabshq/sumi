import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { chatPartsOn } from "./gateways/assistant-parts/chat-parts-on.js";
import type { AssistantHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";
import { AssistantCallersGuard } from "./features/chat/requests.js";
import { handled } from "./generated/handled.js";

export type { AssistantHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";

export const AssistantModule = module("assistant")
	.on(Anywhere)
	.config<AssistantHosts>()
	.guard(PublicGuard)
	.guard(AssistantCallersGuard)
	.provide((facts) => chatPartsOn(facts))
	.handles(...handled);
