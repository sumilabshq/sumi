import { controlMenu } from "@sumi/control-menu-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AssistantRow } from "./features/sub-pages/ui/assistant-row/assistant-row.js";

export const subPages = plugin("sub-pages")
	.require(controlMenu)
	.apply((app) => {
		app.use(controlMenu).slots.rows.add(AssistantRow);
	});
