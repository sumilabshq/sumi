import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { AGENT_CHAT_APP } from "../../../shared/lib/agent-chat-address.js";
import { AgentChatPage } from "../ui/agent-chat-page/agent-chat-page.js";

export const AGENT_CHAT_TAB_PAGE: DrawnTabPage = {
	page: AgentChatPage,
	header: "none",
	draws: (app) => app === AGENT_CHAT_APP,
	modulesOf: (_tab, offers) =>
		Promise.resolve({
			modules: [],
			imports: [assistant({ over: offers.windowServer })],
		}),
};
