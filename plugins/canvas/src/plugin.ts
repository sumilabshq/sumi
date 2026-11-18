import { agent } from "@sumi/agent-plugin";
import { apps } from "@sumi/apps-plugin";
import { artboards as artboardsContract } from "@sumi/artboards/contract";
import { artboards as artboardsModule } from "@sumi/artboards/implementation";
import { ShownCanvasSchema } from "@sumi/canvas-work/contract";
import { canvasWork } from "@sumi/canvas-work/implementation";
import { chat } from "@sumi/chat-plugin";
import { mcpApps } from "@sumi/mcp-apps-plugin";
import { backend, shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CANVAS_GUIDE } from "./features/agent-tools/lib/canvas-guide.js";
import { domBoardRendering } from "./features/agent-tools/lib/dom-board-rendering.js";
import { canvasTabPage } from "./features/canvas/lib/canvas-tab-page.js";
import { MINI_CANVAS_HEIGHT, MiniCanvas } from "./features/mini-canvas/ui/mini-canvas/mini-canvas.js";
import { CANVAS_ICON } from "./shared/lib/canvas-icon.js";

export const canvas = plugin("canvas")
	.require(backend, shell, apps, agent, chat, mcpApps)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => artboardsModule({ store }), artboardsContract);
		app.use(apps).app({ id: "canvas", title: "Canvas", icon: CANVAS_ICON });
		app.use(shell).tabPage(canvasTabPage);
		app.use(agent).mcp.addServer({ name: "canvas", modules: [canvasWork({ rendering: domBoardRendering })] });
		app.use(agent).addPromptPart(() => CANVAS_GUIDE);
		app.use(chat).pageImport(({ core }) => artboardsContract({ over: core }));
		app.use(mcpApps).add({
			name: "canvas-mini",
			schema: ShownCanvasSchema,
			view: MiniCanvas,
			height: MINI_CANVAS_HEIGHT,
			guide: "canvas-work_canvases_show-canvas: a live mini canvas of one canvas page the person can pan, zoom and switch pages in. It needs artboards: draw them first (canvas-work_boards_write-board), then show the page.",
		});
	});
