import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { KeepCameraCommand } from "../../requests/keep-camera.command.js";

export class KeepCameraCommandHandler extends handlerOf(KeepCameraCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ camera }: InputOf<typeof KeepCameraCommand>): Promise<void> {
		this.canvasStore.change({ camera }, "camera moved");
	}
}
