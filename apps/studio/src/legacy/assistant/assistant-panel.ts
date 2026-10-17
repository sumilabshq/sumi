import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ASSISTANT_NOT_AVAILABLE } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AssistantChat } from "./assistant-chat.js";
import { ChatLeadHead } from "./chat-lead.js";

export interface AssistantPanelProps {
	readonly assistant: AssistantPort;
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

export function AssistantPanel({ assistant, lead, title }: AssistantPanelProps): ReactElement {
	const shown = assistant.can
		? h(AssistantChat, { port: assistant, lead, title })
		: h("div", { className: "wg-studio-ai" }, [
				h(ChatLeadHead, { key: "head", lead, title }),
				h("p", { key: "quiet", className: "wg-studio-ai-quiet" }, ASSISTANT_NOT_AVAILABLE),
			]);
	return h("div", { className: "wg-root wg-studio-ai-host" }, shown);
}
