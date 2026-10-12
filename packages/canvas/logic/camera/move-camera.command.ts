import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { CameraAskSchema } from "../../schemas/camera.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class MoveCameraCommand extends ICommand.input(CameraAskSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ camera }: z.output<typeof CameraAskSchema>): Promise<void> {
		canvasSourceIn(this.ports).state.change({ camera }, camera ? "camera moved" : "camera fits the pages");
	}
}
