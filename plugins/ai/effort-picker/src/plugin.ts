import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { EffortButton } from "./features/effort-picker/ui/effort-button/effort-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const effortPicker = plugin("effort-picker")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(EffortButton);
	});
