import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { PageRendererSchema } from "../../schema/canvas-view.js";
import { CanvasStore } from "./canvas-store.js";

export const ChooseRendererCommand = command("canvas/choose-renderer")
	.input(z.object({ renderer: PageRendererSchema }))
	.idempotencyKey("none");

export class ChooseRendererCommandHandler extends handlerOf(ChooseRendererCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ renderer }: InputOf<typeof ChooseRendererCommand>): Promise<void> {
		this.canvasStore.change({ renderer }, `draw pages as ${renderer}`);
	}
}
