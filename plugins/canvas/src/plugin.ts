import { agent } from "@sumi/agent-plugin";
import { apps } from "@sumi/apps-plugin";
import { artboards as artboardsContract } from "@sumi/artboards/contract";
import { artboards as artboardsModule } from "@sumi/artboards/implementation";
import { canvasWork } from "@sumi/canvas-work/implementation";
import { backend, shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CANVAS_GUIDE } from "./features/agent-tools/lib/canvas-guide.js";
import { domBoardRendering } from "./features/agent-tools/lib/dom-board-rendering.js";
import { canvasTabPage } from "./features/canvas/lib/canvas-tab-page.js";

export const canvas = plugin("canvas")
	.require(backend, shell, apps, agent)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => artboardsModule({ store }), artboardsContract);
		app.use(apps).app({ id: "canvas", title: "Canvas", art: "canvas" });
		app.use(shell).tabPage(canvasTabPage);
		app.use(agent).mcp.addServer({ name: "canvas", modules: [canvasWork({ rendering: domBoardRendering })] });
		app.use(agent).addPromptPart(() => CANVAS_GUIDE);
	});
