import type { ChatPartsGateway } from "../chat-parts/chat-parts.gateway.js";
import { LentChatPartsGateway } from "../chat-parts/lent.gateway.js";
import type { AssistantHosts } from "./assistant-parts.gateway.js";

export type AssistantModuleParts = {
	readonly chatParts: ChatPartsGateway;
};

export function chatPartsOn({ config }: { readonly config: AssistantHosts }): AssistantModuleParts {
	return {
		chatParts: new LentChatPartsGateway(config),
	};
}
