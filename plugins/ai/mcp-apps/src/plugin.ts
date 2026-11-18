import { agent } from "@sumi/agent-plugin";
import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import type { z } from "zod";
import { AddedViews } from "./features/call-views/lib/added-views.js";
import { mcpAppsGuideOf } from "./features/call-views/lib/mcp-apps-guide.js";
import { callViewsOf } from "./features/call-views/ui/call-views/call-views.js";
import type { McpAppEntry } from "./shared/lib/mcp-app-entry.js";

export const mcpApps = plugin("mcp-apps")
	.require(chat, agent)
	.apply((app) => {
		const views = new AddedViews();
		app.use(chat).slots.callViews.add(callViewsOf(views));
		app.use(agent).addPromptPart(() => mcpAppsGuideOf(views.guides()));
		return {
			add: <Schema extends z.ZodType>(entry: McpAppEntry<Schema>): void => {
				views.add(entry);
			},
		};
	});
