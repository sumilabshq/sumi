import { apps } from "@sumi/apps-plugin";
import { chat } from "@sumi/chat-plugin";
import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AGENT_CHAT_TAB_PAGE } from "./features/agent-chat/lib/agent-chat-tab-page.js";
import { BackgroundAgents } from "./features/background-agents/ui/background-agents/background-agents.js";
import { windowAppProviderOf } from "./features/background-agents/ui/window-app-provider/window-app-provider.js";
import { AGENT_CHAT_APP } from "./shared/lib/agent-chat-address.js";
import metadata from "../metadata.json" with { type: "json" };

export const backgroundAgents = plugin("background-agents")
	.describe(metadata)
	.require(chat, apps, shell)
	.apply((app) => {
		app.use(chat).slots.afterEnd.add(BackgroundAgents);
		app.use(apps).app({
			id: AGENT_CHAT_APP,
			title: "Background agent",
			art: "chat",
			isListed: false,
			tabs: { isChat: false, splits: true, runsInPage: false, keepsRecord: false },
		});
		app.use(shell).tabPage(AGENT_CHAT_TAB_PAGE);
		app.use(shell).provider(windowAppProviderOf);
	});
