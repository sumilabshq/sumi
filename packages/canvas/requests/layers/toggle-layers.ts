import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";

export const ToggleLayersCommand = command("canvas/toggle-layers").idempotencyKey("none");

export class ToggleLayersCommandHandler extends handlerOf(ToggleLayersCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<void> {
		this.canvasStore.change({ isLayersOpen: !this.canvasStore.now().isLayersOpen }, "toggle layers");
	}
}
