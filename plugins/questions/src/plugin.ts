import { ask } from "@sumi/ask/implementation";
import { chat } from "@sumi/chat-plugin";
import { mcp } from "@sumi/mcp-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { questions as questionsContract } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { QuestionsDock } from "./features/questions/ui/questions-dock/questions-dock.js";

export const questions = plugin("questions")
	.require(backend, chat, mcp)
	.apply((app) => {
		app.use(backend).module(questionsModule, questionsContract);
		app.use(chat).slots.dock.add(QuestionsDock);
		app.use(mcp).server({
			name: "questions",
			modules: [ask],
		});
	});
