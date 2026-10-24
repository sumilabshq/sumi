import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { DrawnDesign } from "../../shared/schema/design.schema.js";
import type { CanvasDoc } from "../../shared/schema/doc.schema.js";
import { shownWidgetsOf } from "../../shared/lib/design/shown-widgets.js";
import { DesignFolderGateway } from "./design-folder.gateway.js";

export class WebDesignFolderGateway extends DesignFolderGateway {
	constructor(private readonly project: StartedProject) {
		super();
	}

	override async readDesign(): Promise<DrawnDesign> {
		const { routes, registry } = this.project;
		const screens = routes.map((route) => ({
			name: route.path,
			states: [{ name: route.path, board: normalizeBoard(route.board) }],
		}));
		const widgets = shownWidgetsOf(registry, registry.ids(), screens);
		return { screens, references: [], widgets: widgets.map((id) => ({ id, isFromCatalogue: false })) };
	}

	override async readDocs(): Promise<readonly CanvasDoc[]> {
		return [];
	}

	override async readSpec(): Promise<null> {
		return null;
	}

	override watch(): () => void {
		return () => undefined;
	}
}
