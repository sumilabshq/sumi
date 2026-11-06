import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StartedApp } from "@widgetarium/framework";
import { ChatNote } from "./chat-note.js";
import { ChatOf } from "./chat-of.js";
import type { TabRead } from "./tab-read.js";

const NO_CHAT = "Open a chat from Sumi to talk to the agent here.";

export function ChatOfTab({ tab, shell }: { readonly tab: TabRead; readonly shell: StartedApp }): ReactElement | null {
	if (tab.kind === "reading") {
		return null;
	}

	if (tab.kind === "failed") {
		return <ChatNote said={tab.reason} />;
	}

	if (tab.chatId === null) {
		return <ChatNote said={NO_CHAT} />;
	}

	return <ChatOf key={tab.chatId} chatId={tab.chatId} shell={shell} />;
}
