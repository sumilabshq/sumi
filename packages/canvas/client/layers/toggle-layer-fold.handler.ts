import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ToggleLayerFoldCommand } from "../../requests/toggle-layer-fold.command.js";

export class ToggleLayerFoldCommandHandler extends handlerOf(ToggleLayerFoldCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ id }: InputOf<typeof ToggleLayerFoldCommand>): Promise<void> {
		const closed = this.canvasStore.now().closedLayers;
		const closedLayers = closed.includes(id) ? closed.filter((mark) => mark !== id) : [...closed, id];
		this.canvasStore.change({ closedLayers }, `fold ${id}`);
	}
}
