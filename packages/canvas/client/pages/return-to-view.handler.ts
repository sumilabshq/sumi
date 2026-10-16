import { handlerOf } from "@widgetarium/core/mediator";
import { ViewReturn } from "../../lib/pages/view-return.js";
import { ReturnToViewCommand } from "../../requests/return-to-view.command.js";

export class ReturnToViewCommandHandler extends handlerOf(ReturnToViewCommand) {
	private readonly viewReturn = this.inject(ViewReturn);

	override handle(): Promise<void> {
		return this.viewReturn.returnToView();
	}
}
