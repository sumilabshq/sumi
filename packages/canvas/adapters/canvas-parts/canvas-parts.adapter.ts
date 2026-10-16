import type { CanvasHost } from "../canvas-host/canvas-host.adapter.js";
import type { DesignDrawing } from "../design-drawing/design-drawing.adapter.js";
import type { DesignFiles } from "../design-files/design-files.adapter.js";
import type { DesignFolder } from "../design-folder/design-folder.adapter.js";
import type { DesignJobs } from "../design-jobs/design-jobs.adapter.js";

export interface CanvasParts {
	readonly canvasHost: CanvasHost;
	readonly designFolder: DesignFolder;
	readonly designJobs: DesignJobs;
	readonly designDrawing: DesignDrawing;
	readonly designFiles: DesignFiles;
}
