import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { chatModulesOf } from "./chat-modules-of.js";
import type { ChatPageParts } from "./chat-modules-of.js";
import { LazyChatRoot } from "./lazy-chat-root.js";

const CHAT_APP = "chat";

export function chatTabPageOf(parts: ChatPageParts): DrawnTabPage {
	return {
		page: LazyChatRoot,
		header: "none",
		draws: (app) => app === CHAT_APP,
		modulesOf: chatModulesOf(parts),
	};
}
