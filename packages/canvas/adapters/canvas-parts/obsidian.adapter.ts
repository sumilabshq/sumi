import type { DataAdapter } from "obsidian";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { CanvasHost } from "../canvas-host/canvas-host.adapter.js";
import { ObsidianDesignDrawing } from "../design-drawing/obsidian.adapter.js";
import { ObsidianDesignFiles } from "../design-files/obsidian.adapter.js";
import { ObsidianDesignFolder } from "../design-folder/obsidian/obsidian.adapter.js";
import type { DesignJobs } from "../design-jobs/design-jobs.adapter.js";
import type { FetchUrl } from "../../shared/lib/pictures/off-screen.js";
import type { CanvasParts } from "./canvas-parts.adapter.js";
import type { Drawing } from "../../shared/schema/drawing.schema.js";

export interface ObsidianDesign {
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
	readonly host: Drawing["host"];
	readonly jobs: DesignJobs;
	readonly fetchUrl: FetchUrl;
}

export function obsidianCanvasParts(
	{ adapter, registry, host, jobs, fetchUrl }: ObsidianDesign,
	canvasHost: CanvasHost,
): CanvasParts {
	return {
		canvasHost,
		designFolder: new ObsidianDesignFolder(adapter, registry),
		designJobs: jobs,
		designDrawing: new ObsidianDesignDrawing(registry, host, fetchUrl),
		designFiles: new ObsidianDesignFiles(adapter),
	};
}

// TRADE-OFF: shot drawing helpers ride on the Obsidian parts entry; the host draws shots, no port owns it yet.
export { drawnOffScreen, pictureTakerOf, pngOf, stackedPngOf } from "../../shared/lib/pictures/off-screen.js";
export type { FetchUrl } from "../../shared/lib/pictures/off-screen.js";
