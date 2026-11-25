import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ModeButton } from "./features/permission-mode/ui/mode-button/mode-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const permissionMode = plugin("permission-mode")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(ModeButton);
	});
