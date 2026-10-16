import { handlerOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { FinishFlightCommand } from "../../requests/finish-flight.command.js";

export class FinishFlightCommandHandler extends handlerOf(FinishFlightCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<void> {
		this.canvasStore.change({ focusedWidget: null }, "flown to the widget");
	}
}
