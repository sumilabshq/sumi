import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { CameraAskSchema } from "../../schemas/camera.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class MoveCameraCommand extends ICommand.input(CameraAskSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ camera }: z.output<typeof CameraAskSchema>): Promise<void> {
		this.state.change({ camera }, camera ? "camera moved" : "camera fits the pages");
	}
}
