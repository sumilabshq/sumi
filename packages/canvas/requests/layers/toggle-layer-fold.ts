import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";

export const ToggleLayerFoldCommand = command("canvas/toggle-layer-fold")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("none");

export class ToggleLayerFoldCommandHandler extends handlerOf(ToggleLayerFoldCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ id }: InputOf<typeof ToggleLayerFoldCommand>): Promise<void> {
		const closed = this.canvasStore.now().closedLayers;
		const closedLayers = closed.includes(id) ? closed.filter((mark) => mark !== id) : [...closed, id];
		this.canvasStore.change({ closedLayers }, `fold ${id}`);
	}
}
