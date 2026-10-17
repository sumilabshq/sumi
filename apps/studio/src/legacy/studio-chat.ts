import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { ChatWidth } from "@widgetarium/core/engine/studio-state-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AssistantPanel } from "./assistant/assistant-panel.js";
import { ChatEdge } from "./chat-edge.js";

export interface StudioChatProps {
	readonly assistant: AssistantPort;
	readonly menu: ReactNode;
	readonly chatWidth: ChatWidth;
	readonly frame: RefObject<HTMLDivElement | null>;
}

const CHAT_LABEL = "AI assistant";

export function StudioChat({ assistant, menu, chatWidth, frame }: StudioChatProps): ReactElement {
	const column = useRef<HTMLElement | null>(null);
	return h("aside", { ref: column, className: "wg-studio-chat", "aria-label": CHAT_LABEL }, [
		h(AssistantPanel, { key: "chat", assistant, lead: menu }),
		h(ChatEdge, { key: "edge", chatWidth, column, frame }),
	]);
}
