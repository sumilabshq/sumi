import { handlerOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ToggleLayersCommand } from "../../requests/toggle-layers.command.js";

export class ToggleLayersCommandHandler extends handlerOf(ToggleLayersCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<void> {
		this.canvasStore.change({ isLayersOpen: !this.canvasStore.now().isLayersOpen }, "toggle layers");
	}
}
