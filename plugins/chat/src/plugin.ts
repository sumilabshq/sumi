import { apps } from "@sumi/apps-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { assistant as assistantModule } from "@widgetarium/assistant/implementation";
import { chatTabs } from "@sumi/chat-tabs/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { questions } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import { CHAT_TAB_PAGE } from "./features/chat-page/lib/chat-tab-page.js";
import { isOutsideHolders } from "./features/chat-page/lib/chat-standing.js";

export const chat = plugin("chat")
	.require(sumiHost, apps, commandMenu)
	.fill(
		apps.apps.add({
			id: "chat",
			title: "New chat",
			art: "chat",
			isListed: false,
			tabs: { canStandIn: isOutsideHolders, holdsTabs: true, splits: true, runsInPage: false, keepsRecord: true },
		}),
		sumiHost.backgroundModules.add({ id: "questions", module: () => questionsModule, contract: questions }),
		sumiHost.tabPage.add({ id: "chat", tabPage: () => CHAT_TAB_PAGE }),
		sumiHost.windowModules.add({ id: "chat-tabs", module: () => chatTabs }),
		sumiHost.windowServerModules.add({ id: "assistant", module: ({ assistant }) => assistantModule(assistant) }),
		sumiHost.windowProviders.add({ id: "ask-composer", provider: askComposerProviderOf }),
	)
	.apply((app) => {
		app.use(commandMenu).door({
			id: "ask",
			letter: "i",
			label: "Ask",
			placeholder: "Ask Sumi anything",
			startsWith: "empty",
		});
		app.use(commandMenu).page({ id: "ask", draftsOf: askPageOf });
	});
