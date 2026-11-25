import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { SlashCommands } from "./features/slash-menu/ui/slash-commands/slash-commands.js";
import metadata from "../metadata.json" with { type: "json" };

export const slashCommands = plugin("slash-commands")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.composerInput.add(SlashCommands);
	});
