import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ShowPageCommand } from "../../requests/show-page.command.js";

export class ShowPageCommandHandler extends handlerOf(ShowPageCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ page }: InputOf<typeof ShowPageCommand>): Promise<void> {
		this.canvasStore.change({ page }, `show ${page}`);
	}
}
