import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { chatModulesOf } from "./chat-modules-of.js";
import { LazyChatRoot } from "./lazy-chat-root.js";

const CHAT_APP = "chat";

export const CHAT_TAB_PAGE: DrawnTabPage = {
	page: LazyChatRoot,
	header: "none",
	draws: (app) => app === CHAT_APP,
	modulesOf: chatModulesOf,
};
