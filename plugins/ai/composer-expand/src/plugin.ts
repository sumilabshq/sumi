import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ExpandFrame } from "./features/composer-expand/ui/expand-frame/expand-frame.js";
import { ExpandToggle } from "./features/composer-expand/ui/expand-toggle/expand-toggle.js";
import metadata from "../metadata.json" with { type: "json" };

export const composerExpand = plugin("composer-expand")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.frame.replace(ExpandFrame);
		app.use(chat).slots.composerBar.add(ExpandToggle);
	});
