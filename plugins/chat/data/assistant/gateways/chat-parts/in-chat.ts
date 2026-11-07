import type { ChatKeyed } from "../../shared/schema/chat-key.schema.js";
import type { AssistantParts } from "../assistant-parts/assistant-parts.gateway.js";
import type { ChatPartsGateway } from "./chat-parts.gateway.js";

interface ChatPartsReach {
	readonly chatParts: ChatPartsGateway;
}

// TRADE-OFF: handlers reach one chat's gateways through partsOf; gateways keyed by chat per method is the target, a rewrite of the older module shape
export function inChat<In extends ChatKeyed, Context extends ChatPartsReach, Out>(
	handle: (input: In, parts: Omit<Context, "chatParts"> & AssistantParts) => Out,
): (input: In, context: Context) => Out {
	return (input, context) => handle(input, { ...context, ...context.chatParts.partsOf(input.chat) });
}
