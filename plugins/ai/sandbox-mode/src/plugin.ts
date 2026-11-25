import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { SandboxButton } from "./features/sandbox-mode/ui/sandbox-button/sandbox-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const sandboxMode = plugin("sandbox-mode")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(SandboxButton);
	});
