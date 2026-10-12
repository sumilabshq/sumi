import type { AppHost } from "@widgetarium/core/mediator";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../schema/canvas-view.js";
import type { ObsidianDesignHeld } from "./design-source-obsidian.js";

export type CanvasPlatform = "obsidian" | "web";

export interface CanvasHostParts {
	readonly platform: CanvasPlatform;
	readonly opened: CanvasOpened;
	readonly obsidian?: ObsidianDesignHeld | undefined;
	readonly project?: StartedProject | undefined;
	readonly gpu?: GpuSupply | undefined;
	readonly ownsPaste?: (() => boolean) | undefined;
	readonly returnToView?: (() => Promise<void>) | undefined;
	readonly keepOpening?: ((kept: CanvasOpening) => void) | undefined;
}

export abstract class CanvasHost implements AppHost {
	abstract is(platform: string): boolean;
	abstract readonly opened: CanvasOpened;
	abstract readonly obsidian: ObsidianDesignHeld | null;
	abstract readonly project: StartedProject | null;
	abstract readonly gpu: GpuSupply | null;
	abstract readonly ownsPaste: () => boolean;
	abstract readonly returnToView: (() => Promise<void>) | null;
	abstract readonly keepOpening: (kept: CanvasOpening) => void;
}

const NOT_A_CANVAS_HOST = "the canvas runs only on a host made by canvasHost()";
const CANVAS_HOSTS = new WeakSet<AppHost>();

export function canvasHost(parts: CanvasHostParts): CanvasHost {
	const made: CanvasHost = {
		is: (platform) => platform === parts.platform,
		opened: parts.opened,
		obsidian: parts.obsidian ?? null,
		project: parts.project ?? null,
		gpu: parts.gpu ?? null,
		ownsPaste: parts.ownsPaste ?? isAlwaysOwner,
		returnToView: parts.returnToView ?? null,
		keepOpening: parts.keepOpening ?? keepsNothing,
	};
	CANVAS_HOSTS.add(made);
	return made;
}

export function canvasHostOf(host: AppHost): CanvasHost {
	if (!isCanvasHost(host)) throw new Error(NOT_A_CANVAS_HOST);
	return host;
}

function isCanvasHost(host: AppHost): host is CanvasHost {
	return CANVAS_HOSTS.has(host);
}

function isAlwaysOwner(): boolean {
	return true;
}

function keepsNothing(): void {}
