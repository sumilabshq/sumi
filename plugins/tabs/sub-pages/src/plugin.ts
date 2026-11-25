import { controlMenu } from "@sumi/control-menu-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AssistantRow } from "./features/sub-pages/ui/assistant-row/assistant-row.js";
import metadata from "../metadata.json" with { type: "json" };

export const subPages = plugin("sub-pages")
	.describe(metadata)
	.require(controlMenu)
	.apply((app) => {
		app.use(controlMenu).slots.rows.add(AssistantRow);
	});
