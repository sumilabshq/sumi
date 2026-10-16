import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ResolveSpotCommand } from "../../requests/resolve-spot.command.js";

export class ResolveSpotCommandHandler extends handlerOf(ResolveSpotCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ spot }: InputOf<typeof ResolveSpotCommand>): Promise<void> {
		const { selection } = this.canvasStore.now();
		if (selection?.mark !== spot.mark)
			return console.info(`[widgetarium] canvas spot of ${spot.mark} dropped: the pick moved on`);
		this.canvasStore.change({ selection: { ...selection, spot } }, `found ${spot.mark} on the canvas`);
	}
}
