import type { App as ObsidianApp } from "obsidian";
import { app } from "../packages/core/src/mediator/index.ts";
import type { AnyHost, App, Module, ObsidianHost, WebHost } from "../packages/core/src/mediator/index.ts";
import type { StartedProject } from "../packages/core/src/app/widgetarium-app.js";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import type { ObsidianDesignOrigin } from "../packages/canvas/adapters/canvas-host/canvas-host.adapter.ts";
import type { CanvasOpened, CanvasOpening } from "../packages/canvas/schema/canvas-view.schema.ts";
import type { GpuSupply } from "../packages/gpu/index.ts";
import { onPlatform } from "./mediator-fixture.ts";
import { standIn } from "./stand-in.ts";

export interface CanvasAsk {
	readonly opened: CanvasOpened;
	readonly ownsPaste?: () => boolean;
	readonly gpu?: GpuSupply | null;
	readonly keepOpening?: (kept: CanvasOpening) => void;
}

export const FARM_OPENED: CanvasOpened = { app: "Farm", page: "Home", isLayersOpen: false, mode: "hand" };

export function emptyProject(): StartedProject {
	return standIn<StartedProject>(
		{ registry: new ModuleRegistry({}), routes: [], hostOf: () => ({}), app: { name: "Farm" } },
		["registry", "routes", "hostOf", "app"],
		"project",
	);
}

export function webCanvasHostOf(ask: CanvasAsk, project = emptyProject()): WebHost {
	return { platform: "web", project, canvas: { ...mountOf(ask), returnToView: async () => undefined } };
}

export function obsidianCanvasHostOf(
	ask: CanvasAsk,
	design: ObsidianDesignOrigin = { kind: "project", project: emptyProject() },
	obsidian: ObsidianApp = standIn<ObsidianApp>({}, [], "app"),
): ObsidianHost {
	return { platform: "obsidian", app: obsidian, canvas: { ...mountOf(ask), returnTo: "app-note", design } };
}

export function canvasAppOn(host: AnyHost, modules: readonly Module[]): App {
	const platform = host.platform === "server" ? "web" : host.platform;
	return onPlatform(platform, () => app({ modules, platforms: [platform], host }));
}

function mountOf({ opened, ownsPaste = never, gpu = null, keepOpening = keepsNothing }: CanvasAsk) {
	return { opened, ownsPaste, gpu, keepOpening };
}

function never(): boolean {
	return false;
}

function keepsNothing(): void {}
