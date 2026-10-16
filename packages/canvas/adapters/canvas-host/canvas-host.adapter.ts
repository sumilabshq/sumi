import type { App } from "obsidian";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";
import type { ObsidianDesignHeld } from "../design-source/obsidian/obsidian.adapter.js";

export interface CanvasMount {
	readonly opened: CanvasOpened;
	readonly keepOpening: (kept: CanvasOpening) => void;
	readonly ownsPaste: () => boolean;
	readonly gpu: GpuSupply | null;
}

export type ObsidianDesignOrigin =
	| { readonly kind: "vault"; readonly held: ObsidianDesignHeld }
	| { readonly kind: "project"; readonly project: StartedProject };

export type ReturnTo = "app-note" | (() => Promise<void>);

export interface ObsidianCanvasParts extends CanvasMount {
	readonly design: ObsidianDesignOrigin;
	readonly returnTo: ReturnTo;
}

export interface WebCanvasParts extends CanvasMount {
	readonly returnToView: () => Promise<void>;
}

// TODO: move app to host-obsidian's own host types once the canvas can depend on them.
declare module "@widgetarium/core/mediator/platform.js" {
	interface ObsidianHost {
		readonly app: App;
		readonly canvas: ObsidianCanvasParts;
	}
	interface WebHost {
		readonly canvas: WebCanvasParts;
	}
}

export abstract class CanvasHost {
	abstract readonly opened: CanvasOpened;
	abstract readonly gpu: GpuSupply | null;
	abstract ownsPaste(): boolean;
	abstract keepOpening(kept: CanvasOpening): void;
}
