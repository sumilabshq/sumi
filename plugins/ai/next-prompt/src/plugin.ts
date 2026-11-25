import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { NextPrompt } from "./features/next-prompt/ui/next-prompt/next-prompt.js";
import metadata from "../metadata.json" with { type: "json" };

export const nextPrompt = plugin("next-prompt")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.composerInput.add(NextPrompt);
	});
