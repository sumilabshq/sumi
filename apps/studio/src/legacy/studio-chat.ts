import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { ChatWidth } from "@widgetarium/core/engine/studio-state-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AppProvider, app } from "@widgetarium/core/requests";
import { MascotClientModule } from "@widgetarium/mascot/module";
import type { MascotParts } from "@widgetarium/mascot/gateways";
import { AssistantPanel } from "./assistant/assistant-panel.js";
import { ChatEdge } from "./chat-edge.js";

export interface StudioChatProps {
	readonly assistant: AssistantPort;
	readonly mascot: MascotParts;
	readonly menu: ReactNode;
	readonly chatWidth: ChatWidth;
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly appName: string | null;
}

const CHAT_LABEL = "AI assistant";

export function StudioChat({ assistant, mascot, menu, chatWidth, frame, appName }: StudioChatProps): ReactElement {
	const column = useRef<HTMLElement | null>(null);
	const [mascotApp] = useState(() => app({ modules: [MascotClientModule.with(mascot)] }));
	return h("aside", { ref: column, className: "wg-studio-chat", "aria-label": CHAT_LABEL }, [
		h(
			AppProvider,
			{ key: "chat", app: mascotApp },
			h(AssistantPanel, { assistant, lead: menu, title: appName ?? undefined }),
		),
		h(ChatEdge, { key: "edge", chatWidth, column, frame }),
	]);
}
