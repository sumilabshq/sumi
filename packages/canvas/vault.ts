import type { DataAdapter } from "obsidian";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import { VaultAppLook } from "./adapters/app-look/vault.adapter.js";
import type { CanvasHost } from "./adapters/canvas-host/canvas-host.adapter.js";
import { VaultDesignDrawing } from "./adapters/design-drawing/vault.adapter.js";
import { VaultDesignFolder } from "./adapters/design-folder/vault/vault.adapter.js";
import { AssistantDesignJobs } from "./adapters/design-jobs/assistant.adapter.js";
import type { AppJobs } from "./adapters/design-jobs/assistant.adapter.js";
import { VaultDesignLayers } from "./adapters/design-layers/vault.adapter.js";
import { VaultDesignPhotos } from "./adapters/design-photos/vault/vault.adapter.js";
import type { FetchUrl } from "./lib/pictures/off-screen.js";
import type { CanvasParts } from "./module.js";
import type { Drawing } from "./schema/drawing.schema.js";

export interface VaultDesign {
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
	readonly host: Drawing["host"];
	readonly jobs: AppJobs;
	readonly fetchUrl: FetchUrl;
}

export function vaultCanvasParts(
	{ adapter, registry, host, jobs, fetchUrl }: VaultDesign,
	canvasHost: CanvasHost,
): CanvasParts {
	return {
		canvasHost,
		designFolder: new VaultDesignFolder(adapter, registry),
		designJobs: new AssistantDesignJobs(jobs),
		designDrawing: new VaultDesignDrawing(registry, host, fetchUrl),
		designPhotos: new VaultDesignPhotos(adapter),
		designLayers: new VaultDesignLayers(adapter),
		appLook: new VaultAppLook(adapter),
	};
}

export type { AppJobs } from "./adapters/design-jobs/assistant.adapter.js";
export { drawnOffScreen, pictureTakerOf, pngOf, stackedPngOf } from "./lib/pictures/off-screen.js";
export type { FetchUrl } from "./lib/pictures/off-screen.js";
