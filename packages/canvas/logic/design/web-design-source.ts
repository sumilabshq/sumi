import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { DrawnDesign } from "../../schemas/design.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { Drawing } from "../../schemas/drawing.schema.js";
import type { Job, LiveJob } from "../../schemas/job.schema.js";
import type { DesignSource } from "./design-source.js";
import { shownWidgetsOf } from "./shown-widgets.js";

const HOME = "/";

export class WebDesignSource implements DesignSource {
	readonly pictureOf = null;
	private readonly drawn: Drawing;

	constructor(private readonly project: StartedProject) {
		this.drawn = { registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) };
	}

	async design(): Promise<DrawnDesign> {
		const { routes, registry } = this.project;
		const screens = routes.map((route) => ({
			name: route.path,
			states: [{ name: route.path, board: normalizeBoard(route.board) }],
		}));
		const widgets = shownWidgetsOf(registry, registry.ids(), screens);
		return { screens, references: [], widgets: widgets.map((id) => ({ id, isFromCatalogue: false })) };
	}

	async docs(): Promise<readonly CanvasDoc[]> {
		return [];
	}

	jobs(): readonly Job[] {
		return [];
	}

	onJobs(): () => void {
		return () => undefined;
	}

	liveJob(): LiveJob | null {
		return null;
	}

	stopJob(): Promise<void> {
		return refuseOffHost();
	}

	drawing(): Drawing {
		return this.drawn;
	}

	onChanged(): () => void {
		return () => undefined;
	}

	addPhotos(): Promise<void> {
		return refuseOffHost();
	}

	moveLayer(): Promise<void> {
		return refuseOffHost();
	}

	returnToView(): Promise<void> {
		return refuseOffHost();
	}

	async look(): Promise<null> {
		return null;
	}

	pickLook(): Promise<void> {
		return refuseOffHost();
	}
}

function refuseOffHost(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}
