import { CommandMenuPlugin, MenuDoorsSlot, MenuPagesSlot } from "@sumi/command-menu-plugin";
import { BackgroundModulesSlot, SumiHostPlugin, TabPageSlot, WindowProvidersSlot } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { QuestionsModule as QuestionsContract } from "@widgetarium/questions";
import { QuestionsModule } from "@widgetarium/questions/module";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import { CHAT_TAB_PAGE } from "./features/chat-page/lib/chat-tab-page.js";

export const ChatPlugin = plugin("chat")
	.require(SumiHostPlugin, CommandMenuPlugin)
	.fill(
		BackgroundModulesSlot({ id: "questions", module: () => QuestionsModule, contract: QuestionsContract }),
		TabPageSlot({ id: "chat", tabPage: () => CHAT_TAB_PAGE }),
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
