import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { DrawnDesign } from "../../shared/schema/drawn-design.schema.js";
import { shownWidgetsOf } from "../../shared/lib/design/shown-widgets.js";
import { DesignFolderGateway } from "./design-folder.gateway.js";
import type { DesignFolderRead } from "../../shared/lib/design/design-shown.js";

export class WebDesignFolderGateway extends DesignFolderGateway {
	constructor(private readonly project: StartedProject) {
		super();
	}

	override async folder(): Promise<DesignFolderRead> {
		return {
			design: this.projectDesign(),
			docs: [],
			look: null,
		};
	}

	override async spec(): Promise<null> {
		return null;
	}

	override forgetFolder(): void {}

	override designChanged(): () => void {
		return () => undefined;
	}

	private projectDesign(): DrawnDesign {
		const { routes, registry } = this.project;
		const screens = routes.map((route) => ({
			name: route.path,
			states: [
				{
					name: route.path,
					board: normalizeBoard(route.board),
				},
			],
		}));
		const widgets = shownWidgetsOf(registry, registry.ids(), screens);
		return {
			screens,
			references: [],
			widgets: widgets.map((id) => ({
				id,
				isFromCatalogue: false,
			})),
		};
	}
}
