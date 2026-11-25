import { ask } from "@sumi/ask/implementation";
import { chat } from "@sumi/chat-plugin";
import { agent } from "@sumi/agent-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { questions as questionsContract } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { BackToQuestions } from "./features/questions/ui/back-to-questions/back-to-questions.js";
import { OpenQuestions } from "./features/questions/ui/questions-block/open-questions.js";
import metadata from "../metadata.json" with { type: "json" };

export const questions = plugin("questions")
	.describe(metadata)
	.require(backend, chat, agent)
	.apply((app) => {
		app.use(backend).module(questionsModule, questionsContract);
		app.use(chat).slots.beforeLive.add(OpenQuestions);
		app.use(chat).slots.toEndLabel.add(BackToQuestions);
		app.use(agent).mcp.addServer({
			name: "questions",
			modules: [ask],
		});
	});
