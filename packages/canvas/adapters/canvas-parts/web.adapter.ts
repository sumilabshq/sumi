import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { CanvasHost } from "../canvas-host/canvas-host.adapter.js";
import { WebDesignDrawing } from "../design-drawing/web.adapter.js";
import { WebDesignFiles } from "../design-files/web.adapter.js";
import { WebDesignFolder } from "../design-folder/web.adapter.js";
import { WebDesignJobs } from "../design-jobs/web.adapter.js";
import type { CanvasParts } from "./canvas-parts.adapter.js";

export function webCanvasParts(project: StartedProject, canvasHost: CanvasHost): CanvasParts {
	return {
		canvasHost,
		designFolder: new WebDesignFolder(project),
		designJobs: new WebDesignJobs(),
		designDrawing: new WebDesignDrawing(project),
		designFiles: new WebDesignFiles(),
	};
}
