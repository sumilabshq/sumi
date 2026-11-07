import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { CommandMenuPlugin, MenuDoorsSlot, MenuPagesSlot } from "@sumi/command-menu-plugin";
import {
	BackgroundModulesSlot,
	SumiHostPlugin,
	TabPageSlot,
	WindowProvidersSlot,
	WindowServerModulesSlot,
} from "@sumi/sumi-host-plugin";
import { AssistantModule } from "@widgetarium/assistant/module";
import { plugin } from "@widgetarium/plugin-framework";
import { QuestionsModule as QuestionsContract } from "@widgetarium/questions";
import { QuestionsModule } from "@widgetarium/questions/module";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import { CHAT_TAB_PAGE } from "./features/chat-page/lib/chat-tab-page.js";

export const ChatPlugin = plugin("chat")
	.require(SumiHostPlugin, AppsPlugin, CommandMenuPlugin)
	.fill(
		AppsSlot({
			id: "chat",
			title: "New chat",
			art: "chat",
			isListed: false,
			tabs: { holdsTabs: true, splits: true, runsInPage: false, keepsRecord: true },
		}),
		BackgroundModulesSlot({ id: "questions", module: () => QuestionsModule, contract: QuestionsContract }),
		TabPageSlot({ id: "chat", tabPage: () => CHAT_TAB_PAGE }),
		WindowServerModulesSlot({ id: "assistant", module: ({ assistant }) => AssistantModule(assistant) }),
		WindowProvidersSlot({ id: "ask-composer", provider: askComposerProviderOf }),
		MenuDoorsSlot({
			id: "ask",
			letter: "i",
			label: "Ask",
			placeholder: "Ask Sumi anything",
			startsWith: "empty",
		}),
		MenuPagesSlot({ id: "ask", draftsOf: askPageOf }),
	);
