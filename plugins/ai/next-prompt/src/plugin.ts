import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { NextPrompt } from "./features/next-prompt/ui/next-prompt/next-prompt.js";

export const nextPrompt = plugin("next-prompt")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.composerInput.add(NextPrompt);
	});
