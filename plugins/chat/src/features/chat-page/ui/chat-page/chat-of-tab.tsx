import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { OptionalQueryRead } from "@widgetarium/data-framework";
import { ChatNote } from "./chat-note.js";
import { ChatOf } from "./chat-of.js";

interface ReadChatTab {
	readonly chatId: string | null;
}

const NO_CHAT = "Open a chat from Sumi to talk to the agent here.";

export function ChatOfTab({ tab }: { readonly tab: OptionalQueryRead<ReadChatTab> }): ReactElement | null {
	if (tab.data === null) {
		return tab.failure === null ? null : <ChatNote said={tab.failure} />;
	}

	if (tab.data.chatId === null) {
		return <ChatNote said={NO_CHAT} />;
	}

	return <ChatOf key={tab.data.chatId} chatId={tab.data.chatId} />;
}
