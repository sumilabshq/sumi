import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasModeSchema } from "../../schema/canvas-view.js";
import { CanvasStore } from "./canvas-store.js";

export const SetModeCommand = command("canvas/set-mode")
	.input(z.object({ mode: CanvasModeSchema }))
	.idempotencyKey("none");

export class SetModeCommandHandler extends handlerOf(SetModeCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ mode }: InputOf<typeof SetModeCommand>): Promise<void> {
		this.canvasStore.change({ mode }, `${mode} mode`);
	}
}
