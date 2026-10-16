import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { SetModeCommand } from "../../requests/set-mode.command.js";

export class SetModeCommandHandler extends handlerOf(SetModeCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ mode }: InputOf<typeof SetModeCommand>): Promise<void> {
		this.canvasStore.change({ mode }, `${mode} mode`);
	}
}
