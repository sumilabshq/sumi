import { app } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { SpecRead } from "../packages/shared/core/src/app-spec.ts";
import type { StartedProject } from "../packages/shared/core/src/app/widgetarium-app.js";
import { ModuleRegistry } from "../packages/shared/core/src/engine/module-registry.js";
import { CanvasModule } from "../packages/domain/canvas/module.ts";
import { OpenCanvasCommand } from "../packages/domain/canvas/index.ts";
import { projectCanvasParts } from "../packages/domain/canvas/gateways/canvas-parts/project.gateway.ts";
import type { CanvasParts } from "../packages/domain/canvas/gateways/canvas-parts/canvas-parts.gateway.ts";
import { DesignFolderGateway } from "../packages/domain/canvas/gateways/design-folder/design-folder.gateway.ts";
import { HeldWidgetDrawingGateway } from "../packages/domain/canvas/gateways/widget-drawing/held.gateway.ts";
import type { DesignFolderRead } from "../packages/domain/canvas/shared/lib/design/design-shown.ts";
import type { CanvasOpened } from "../packages/domain/canvas/shared/schema/canvas-view.schema.ts";
import type { DrawnDesign } from "../packages/domain/canvas/shared/schema/drawn-design.schema.ts";
import { standIn } from "./stand-in.ts";

export type { CanvasParts } from "../packages/domain/canvas/gateways/canvas-parts/canvas-parts.gateway.ts";

export const FARM_OPENED: CanvasOpened = { app: "Farm", page: "Home", isLayersOpen: false, mode: "hand" };

type DesignChanged = (listener: (app: string) => void) => () => void;

export function emptyProject(): StartedProject {
	return standIn<StartedProject>(
		{ registry: new ModuleRegistry({}), routes: [], hostOf: () => ({}), app: { name: "Farm" } },
		["registry", "routes", "hostOf", "app"],
		"project",
	);
}

export function canvasPartsOver(chosen: Partial<CanvasParts> = {}): CanvasParts {
	return {
		...projectCanvasParts({ kind: "project", project: emptyProject() }),
		...chosen,
	};
}

export function canvasAppOver(parts: CanvasParts): StartedApp {
	return app()
		.modules(CanvasModule.with(parts))
		.start({ platform: "browser", scope: { workspaceId: FARM_OPENED.app } });
}

export async function openedCanvasOver(parts: CanvasParts, opened: CanvasOpened = FARM_OPENED): Promise<StartedApp> {
	const canvas = canvasAppOver(parts);
	const answer = await canvas.send(OpenCanvasCommand, opened);

	if (!answer.ok) {
		throw new Error(`the test canvas did not open: ${answer.reason}`);
	}

	return canvas;
}

export class FixedDesignFolderGateway extends DesignFolderGateway {
	constructor(
		private readonly drawn: () => Promise<DrawnDesign | null>,
		private readonly changed: DesignChanged = () => keepsNothing,
	) {
		super();
	}

	override async folder(): Promise<DesignFolderRead> {
		return {
			design: await this.drawn(),
			docs: [],
			look: null,
		};
	}

	override async spec(): Promise<SpecRead | null> {
		return null;
	}

	override forgetFolder(): void {}

	override designChanged(listener: (app: string) => void): () => void {
		return this.changed(listener);
	}
}

export class FixedWidgetDrawingGateway extends HeldWidgetDrawingGateway {}

function keepsNothing(): void {}
