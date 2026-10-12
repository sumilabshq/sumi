import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { SelectionSchema } from "../../schema/selection.js";
import { openedTo } from "../layers/opened-to.js";
import { CanvasStore } from "../view/canvas-store.js";

export const PickSpotCommand = command("canvas/pick-spot")
	.input(z.object({ selection: SelectionSchema.nullable() }))
	.idempotencyKey("none");

export class PickSpotCommandHandler extends handlerOf(PickSpotCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ selection }: InputOf<typeof PickSpotCommand>): Promise<void> {
		const closedLayers = openedTo(this.canvasStore.now(), selection);
		this.canvasStore.change({ selection, closedLayers }, selection ? `pick ${selection.mark}` : "clear the pick");
	}
}
