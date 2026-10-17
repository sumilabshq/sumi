import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { ChatLeadHead } from "./chat-lead.js";
import { ReadyChat } from "./ready-chat.js";
import { useAssistantSetup } from "./use-assistant-setup.js";

export interface AssistantChatProps {
	readonly port: AssistantPort;
	readonly setup?: AssistantSetup | undefined;
	readonly lead?: ReactNode;
}

export function AssistantChat({ port, setup, lead }: AssistantChatProps): ReactElement {
	const read = useAssistantSetup(port, setup ?? null);
	if (read.state === "failed") {
		return h("div", { className: "wg-studio-ai" }, [
			h(ChatLeadHead, { key: "head", lead }),
			h("p", { key: "quiet", className: "wg-studio-ai-quiet" }, read.failure),
		]);
	}

	if (read.state === "reading") {
		return h("div", { className: "wg-studio-ai" }, h(ChatLeadHead, { lead }));
	}

	return h(ReadyChat, { port, setup: read.setup, setupFailure: read.failure, lead });
}
