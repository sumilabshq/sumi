import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { EffortButton } from "./features/effort-picker/ui/effort-button/effort-button.js";

export const effortPicker = plugin("effort-picker")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.fieldOptions.add(EffortButton);
	});
