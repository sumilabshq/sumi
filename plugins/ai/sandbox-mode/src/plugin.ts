import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { SandboxButton } from "./features/sandbox-mode/ui/sandbox-button/sandbox-button.js";

export const sandboxMode = plugin("sandbox-mode")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(SandboxButton);
	});
