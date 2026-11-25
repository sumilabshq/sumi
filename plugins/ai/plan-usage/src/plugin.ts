import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { UsageButton } from "./features/plan-usage/ui/usage-button/usage-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const planUsage = plugin("plan-usage")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsEnd.add(UsageButton);
	});
