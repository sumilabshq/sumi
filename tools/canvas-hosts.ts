import { app } from "../packages/core/src/requests/index.ts";
import type { StartedApp } from "../packages/core/src/requests/index.ts";
import type { SpecRead } from "../packages/core/src/app-spec.ts";
import type { StartedProject } from "../packages/core/src/app/widgetarium-app.js";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import { CanvasClientModule } from "../packages/canvas/generated/module.ts";
import {
	CanvasHost,
	DesignDrawing,
	DesignFolder,
	detachedHostOf,
	webCanvasParts,
} from "../packages/canvas/generated/adapters.ts";
import type { CanvasParts } from "../packages/canvas/generated/adapters.ts";
import type { CanvasOpened, CanvasOpening } from "../packages/canvas/shared/schema/canvas-view.schema.ts";
import type { CanvasDoc } from "../packages/canvas/shared/schema/doc.schema.ts";
import type { DrawnDesign } from "../packages/canvas/shared/schema/design.schema.ts";
import type { Drawing } from "../packages/canvas/shared/schema/drawing.schema.ts";
import type { GpuSupply } from "../packages/gpu/index.ts";
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

export function canvasHostOf({
	opened,
	ownsPaste = never,
	gpu = null,
	keepOpening = keepsNothing,
}: CanvasAsk): CanvasHost {
	return new CanvasHost({ ...detachedHostOf(opened), ownsPaste, gpu, keepOpening });
}

export function canvasPartsOver(ask: CanvasAsk, chosen: Partial<CanvasParts> = {}): CanvasParts {
	return { ...webCanvasParts(emptyProject(), canvasHostOf(ask)), ...chosen };
}

export function canvasAppOver(parts: CanvasParts): StartedApp {
	return app({ modules: [CanvasClientModule.with(parts)] });
}

export class FixedDesignFolder extends DesignFolder {
	constructor(
		private readonly drawn: () => Promise<DrawnDesign>,
		private readonly watched: (changed: () => void) => () => void = () => keepsNothing,
	) {
		super();
	}

	override design(): Promise<DrawnDesign> {
		return this.drawn();
	}

	override async docs(): Promise<readonly CanvasDoc[]> {
		return [];
	}

	override async spec(): Promise<SpecRead | null> {
		return null;
	}

	override onChanged(_app: string, changed: () => void): () => void {
		return this.watched(changed);
	}

	override async noteText(): Promise<null> {
		return null;
	}
}

export class FixedDesignDrawing extends DesignDrawing {
	override readonly pictureOf = null;

	constructor(private readonly drawn: Drawing) {
		super();
	}

	override drawing(): Drawing {
		return this.drawn;
	}
}

function never(): boolean {
	return false;
}

function keepsNothing(): void {}
