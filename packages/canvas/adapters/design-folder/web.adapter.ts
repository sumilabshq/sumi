import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { DrawnDesign } from "../../shared/schema/design.schema.js";
import type { CanvasDoc } from "../../shared/schema/doc.schema.js";
import { shownWidgetsOf } from "../../shared/lib/design/shown-widgets.js";
import { DesignFolder } from "./design-folder.adapter.js";

export class WebDesignFolder extends DesignFolder {
	constructor(private readonly project: StartedProject) {
		super();
	}

	override async design(): Promise<DrawnDesign> {
		const { routes, registry } = this.project;
		const screens = routes.map((route) => ({
			name: route.path,
			states: [{ name: route.path, board: normalizeBoard(route.board) }],
		}));
		const widgets = shownWidgetsOf(registry, registry.ids(), screens);
		return { screens, references: [], widgets: widgets.map((id) => ({ id, isFromCatalogue: false })) };
	}

	override async docs(): Promise<readonly CanvasDoc[]> {
		return [];
	}

	override async spec(): Promise<null> {
		return null;
	}

	override onChanged(): () => void {
		return () => undefined;
	}

	override async noteText(): Promise<null> {
		return null;
	}
}
