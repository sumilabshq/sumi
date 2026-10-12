import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CameraSchema } from "../../schema/camera.js";
import { CanvasStore } from "./canvas-store.js";

export const KeepCameraCommand = command("canvas/keep-camera")
	.input(z.object({ camera: CameraSchema }))
	.idempotencyKey("none");

export class KeepCameraCommandHandler extends handlerOf(KeepCameraCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ camera }: InputOf<typeof KeepCameraCommand>): Promise<void> {
		this.canvasStore.change({ camera }, "camera moved");
	}
}
