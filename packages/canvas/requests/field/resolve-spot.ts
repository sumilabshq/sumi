import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { SpotSchema } from "../../schema/selection.js";
import { CanvasStore } from "../view/canvas-store.js";

export const ResolveSpotCommand = command("canvas/resolve-spot")
	.input(z.object({ spot: SpotSchema }))
	.idempotencyKey("none");

export class ResolveSpotCommandHandler extends handlerOf(ResolveSpotCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ spot }: InputOf<typeof ResolveSpotCommand>): Promise<void> {
		const { selection } = this.canvasStore.now();
		if (selection?.mark !== spot.mark)
			return console.info(`[widgetarium] canvas spot of ${spot.mark} dropped: the pick moved on`);
		this.canvasStore.change({ selection: { ...selection, spot } }, `found ${spot.mark} on the canvas`);
	}
}
