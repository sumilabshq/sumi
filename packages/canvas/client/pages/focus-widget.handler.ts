import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { COMPONENTS_PAGE } from "../../schema/canvas-page.schema.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { FocusWidgetCommand } from "../../requests/focus-widget.command.js";

export class FocusWidgetCommandHandler extends handlerOf(FocusWidgetCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ widget }: InputOf<typeof FocusWidgetCommand>): Promise<void> {
		this.canvasStore.change({ page: COMPONENTS_PAGE, focusedWidget: widget }, `open ${widget}`);
	}
}
