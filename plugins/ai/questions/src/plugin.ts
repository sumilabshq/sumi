import { ask } from "@sumi/ask/implementation";
import { chat } from "@sumi/chat-plugin";
import { agent } from "@sumi/agent-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { questions as questionsContract } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { QuestionsDock } from "./features/questions/ui/questions-dock/questions-dock.js";

export const questions = plugin("questions")
	.require(backend, chat, agent)
	.apply((app) => {
		app.use(backend).module(questionsModule, questionsContract);
		app.use(chat).slots.dock.add(QuestionsDock);
		app.use(agent).mcp.addServer({
			name: "questions",
			modules: [ask],
		});
	});
