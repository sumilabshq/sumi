import { handlerOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ToggleLayoutLockCommand } from "../../requests/toggle-layout-lock.command.js";

export class ToggleLayoutLockCommandHandler extends handlerOf(ToggleLayoutLockCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<void> {
		const isLayoutLocked = !this.canvasStore.now().isLayoutLocked;
		this.canvasStore.change({ isLayoutLocked }, isLayoutLocked ? "lock the layout" : "unlock the layout");
	}
}
