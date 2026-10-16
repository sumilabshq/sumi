import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { Drawing } from "../../schema/drawing.schema.js";
import { DesignDrawing } from "./design-drawing.adapter.js";

const HOME = "/";

export class ProjectDesignDrawing extends DesignDrawing {
	override readonly pictureOf = null;
	private readonly drawn: Drawing;

	constructor(project: StartedProject) {
		super();
		this.drawn = { registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) };
	}

	override drawing(): Drawing {
		return this.drawn;
	}
}
