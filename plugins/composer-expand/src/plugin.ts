import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ExpandFrame } from "./features/composer-expand/ui/expand-frame/expand-frame.js";
import { ExpandToggle } from "./features/composer-expand/ui/expand-toggle/expand-toggle.js";

export const composerExpand = plugin("composer-expand")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.frame.replace(ExpandFrame);
		app.use(chat).slots.composerBar.add(ExpandToggle);
	});
