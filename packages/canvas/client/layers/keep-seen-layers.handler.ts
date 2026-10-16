import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { KeepSeenLayersCommand } from "../../requests/keep-seen-layers.command.js";

export class KeepSeenLayersCommandHandler extends handlerOf(KeepSeenLayersCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ key, layers }: InputOf<typeof KeepSeenLayersCommand>): Promise<void> {
		const seenLayers = { ...this.canvasStore.now().seenLayers, [key]: layers };
		this.canvasStore.change({ seenLayers }, `read the layers of ${key}`);
	}
}
