import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ChooseRendererCommand } from "../../requests/choose-renderer.command.js";

export class ChooseRendererCommandHandler extends handlerOf(ChooseRendererCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ renderer }: InputOf<typeof ChooseRendererCommand>): Promise<void> {
		this.canvasStore.change({ renderer }, `draw pages as ${renderer}`);
	}
}
