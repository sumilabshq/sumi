import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { AssistantPanel } from "@widgetarium/assistant";
import type { ChatWidth } from "@widgetarium/core/engine/studio-state-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { chatCardsOver } from "../assistant/chat-cards.js";
import { ChatEdge } from "./chat-edge.js";

export interface StudioChatProps {
	readonly assistant: AssistantPort;
	readonly chatApp: StartedApp;
	readonly menu: ReactNode;
	readonly chatWidth: ChatWidth;
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly appName: string | null;
}

const CHAT_LABEL = "AI assistant";

export function StudioChat({ assistant, chatApp, menu, chatWidth, frame, appName }: StudioChatProps): ReactElement {
	const column = useRef<HTMLElement | null>(null);
	const [cards] = useState(() => chatCardsOver(assistant));
	return h("aside", { ref: column, className: "wg-studio-chat", "aria-label": CHAT_LABEL }, [
		h(
			AppProvider,
			{ key: "chat", app: chatApp },
			h(AssistantPanel, { lead: menu, title: appName ?? undefined, cards }),
		),
		h(ChatEdge, { key: "edge", chatWidth, column, frame }),
	]);
}
