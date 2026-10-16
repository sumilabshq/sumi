import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { openedTo } from "../../lib/layers/opened-to.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { PickSpotCommand } from "../../requests/pick-spot.command.js";

export class PickSpotCommandHandler extends handlerOf(PickSpotCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ selection }: InputOf<typeof PickSpotCommand>): Promise<void> {
		const closedLayers = openedTo(this.canvasStore.now(), selection);
		this.canvasStore.change({ selection, closedLayers }, selection ? `pick ${selection.mark}` : "clear the pick");
	}
}
