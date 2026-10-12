import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { DrawnDesign } from "../schema/design.js";
import type { CanvasDoc } from "../schema/doc.js";
import type { Drawing } from "../schema/drawing.js";
import type { Job, LiveJob } from "../schema/job.js";
import { DesignSource } from "./design-source.port.js";
import { shownWidgetsOf } from "../requests/design/shown-widgets.js";

const HOME = "/";

export class WebDesignSource extends DesignSource {
	override readonly pictureOf = null;
	private readonly drawn: Drawing;

	constructor(private readonly project: StartedProject) {
		super();
		this.drawn = { registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) };
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

	override jobs(): readonly Job[] {
		return [];
	}

	override onJobs(): () => void {
		return () => undefined;
	}

	override liveJob(): LiveJob | null {
		return null;
	}

	override stopJob(): Promise<void> {
		return refuseOffHost();
	}

	override drawing(): Drawing {
		return this.drawn;
	}

	override onChanged(): () => void {
		return () => undefined;
	}

	override addPhotos(): Promise<void> {
		return refuseOffHost();
	}

	override moveLayer(): Promise<void> {
		return refuseOffHost();
	}

	override returnToView(): Promise<void> {
		return refuseOffHost();
	}

	override async look(): Promise<null> {
		return null;
	}

	override pickLook(): Promise<void> {
		return refuseOffHost();
	}

	override async noteBoard(): Promise<null> {
		return null;
	}
}

function refuseOffHost(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}
