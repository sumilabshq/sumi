import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";

export const ToggleLayoutLockCommand = command("canvas/toggle-layout-lock").idempotencyKey("none");

export class ToggleLayoutLockCommandHandler extends handlerOf(ToggleLayoutLockCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<void> {
		const isLayoutLocked = !this.canvasStore.now().isLayoutLocked;
		this.canvasStore.change({ isLayoutLocked }, isLayoutLocked ? "lock the layout" : "unlock the layout");
	}
}
