import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";

export const FinishFlightCommand = command("canvas/finish-flight").idempotencyKey("none");

export class FinishFlightCommandHandler extends handlerOf(FinishFlightCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<void> {
		this.canvasStore.change({ focusedWidget: null }, "flown to the widget");
	}
}
