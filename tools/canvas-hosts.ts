import { app } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import type { SpecRead } from "../packages/shared/core/src/app-spec.ts";
import type { StartedProject } from "../packages/shared/core/src/app/widgetarium-app.js";
import { ModuleRegistry } from "../packages/shared/core/src/engine/module-registry.js";
import { CanvasClientModule } from "../packages/domain/canvas/generated/module.ts";
import {
	CanvasHost,
	WidgetDrawingGateway,
	DesignFolderGateway,
	detachedHostOf,
	webCanvasParts,
} from "../packages/domain/canvas/generated/gateways.ts";
import type { CanvasParts } from "../packages/domain/canvas/generated/gateways.ts";
import type { CanvasOpened, CanvasOpening } from "../packages/domain/canvas/shared/schema/canvas-view.schema.ts";
import type { CanvasDoc } from "../packages/domain/canvas/shared/schema/doc.schema.ts";
import type { DrawnDesign } from "../packages/domain/canvas/shared/schema/design.schema.ts";
import type { GpuSupply } from "../packages/shared/gpu/index.ts";
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

export class FixedDesignFolderGateway extends DesignFolderGateway {
	constructor(
		private readonly drawn: () => Promise<DrawnDesign>,
		private readonly watched: (changed: () => void) => () => void = () => keepsNothing,
	) {
		super();
	}

	override readDesign(): Promise<DrawnDesign> {
		return this.drawn();
	}

	override async readDocs(): Promise<readonly CanvasDoc[]> {
		return [];
	}

	override async readSpec(): Promise<SpecRead | null> {
		return null;
	}

	override watch(_app: string, changed: () => void): () => void {
		return this.watched(changed);
	}
}

export class FixedWidgetDrawingGateway extends WidgetDrawingGateway {}

function never(): boolean {
	return false;
}

function keepsNothing(): void {}
