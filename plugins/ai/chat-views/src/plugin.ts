import { agent } from "@sumi/agent-plugin";
import { fileSystem, terminal } from "@sumi/contract";
import { mcpApps } from "@sumi/mcp-apps-plugin";
import { ShownViewSchema } from "@sumi/view-work/contract";
import { viewWork } from "@sumi/view-work/implementation";
import type { ViewPart, ViewTemplate } from "@sumi/view-work/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { CHAT_VIEWS_PROMPT, CHAT_VIEW_APP_GUIDE } from "./features/chat-view/lib/chat-views-prompt.js";
import { VIEW_TEMPLATES } from "./features/chat-view/lib/view-templates.js";
import { chatViewOf } from "./features/chat-view/ui/chat-view/chat-view.js";
import { VIEW_FRAME_HEIGHT } from "./features/chat-view/ui/view-frame/view-frame.js";
import { CODE_PART } from "./features/code-part/lib/code-part.js";
import metadata from "../metadata.json" with { type: "json" };

export const chatViews = plugin("chat-views")
	.describe(metadata)
	.require(agent, mcpApps)
	.apply((app) => {
		const parts: ViewPart[] = [CODE_PART];
		const templates: ViewTemplate[] = [...VIEW_TEMPLATES];
		app.use(agent).mcp.addServer({
			name: "views",
			modules: [
				viewWork({
					parts,
					templates,
				}),
			],
			importsOf: (core) => [fileSystem({ over: core }), terminal({ over: core })],
		});
		app.use(agent).addPromptPart(() => CHAT_VIEWS_PROMPT);
		app.use(mcpApps).add({
			name: "chat-view",
			schema: ShownViewSchema,
			view: chatViewOf(parts, templates),
			height: VIEW_FRAME_HEIGHT,
			guide: CHAT_VIEW_APP_GUIDE,
		});
		return {
			addPart: (part: ViewPart): void => {
				parts.push(part);
			},
			addTemplate: (template: ViewTemplate): void => {
				templates.push(template);
			},
		};
	});
