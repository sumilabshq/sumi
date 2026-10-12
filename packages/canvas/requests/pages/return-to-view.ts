import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { ViewReturn } from "./view-return.js";

export const ReturnToViewCommand = command("canvas/return-to-view").idempotencyKey("none");

export class ReturnToViewCommandHandler extends handlerOf(ReturnToViewCommand) {
	private readonly viewReturn = inject(ViewReturn);

	override handle(): Promise<void> {
		return this.viewReturn.returnToView();
	}
}
