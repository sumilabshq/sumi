import { artboards } from "@sumi/artboards/contract";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { CanvasPage } from "../ui/canvas-page/canvas-page.js";

const CANVAS_APP = "canvas";

export const canvasTabPage: DrawnTabPage = {
	page: CanvasPage,
	header: "shell",
	draws: (app) => app === CANVAS_APP,
	modulesOf: (_tab, { core }) =>
		Promise.resolve({
			modules: [],
			imports: [artboards({ over: core })],
		}),
};
