import { CommandMenuPlugin, MenuDoorsSlot, MenuPagesSlot } from "@sumi/command-menu-plugin";
import { BackgroundModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { QuestionsModule as QuestionsContract } from "@widgetarium/questions";
import { QuestionsModule } from "@widgetarium/questions/module";
import { askPageOf } from "./ask-page.js";

export const ChatPlugin = plugin("chat")
	.require(SumiHostPlugin, CommandMenuPlugin)
	.fill(
		BackgroundModulesSlot({ id: "questions", module: () => QuestionsModule, contract: QuestionsContract }),
		MenuDoorsSlot({
			id: "ask",
			letter: "i",
			label: "Ask",
			placeholder: "Ask Sumi anything",
			startsWith: "empty",
		}),
		MenuPagesSlot({ id: "ask", draftsOf: askPageOf }),
	);
