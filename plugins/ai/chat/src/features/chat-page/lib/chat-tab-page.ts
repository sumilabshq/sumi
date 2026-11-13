import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { chatModulesOf } from "./chat-modules-of.js";
import type { ChatPageImportOf } from "./chat-modules-of.js";
import { LazyChatRoot } from "./lazy-chat-root.js";

const CHAT_APP = "chat";

export function chatTabPageOf(pageImports: readonly ChatPageImportOf[]): DrawnTabPage {
	return {
		page: LazyChatRoot,
		header: "none",
		draws: (app) => app === CHAT_APP,
		modulesOf: chatModulesOf(pageImports),
	};
}
