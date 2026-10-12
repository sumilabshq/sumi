import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { COMPONENTS_PAGE } from "../../schemas/canvas-page.schema.js";
import { WidgetFocusSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class FocusWidgetCommand extends ICommand.input(WidgetFocusSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ widget }: z.output<typeof WidgetFocusSchema>): Promise<void> {
		if (widget === null) return this.state.change({ focusedWidget: null }, "flown to the widget");
		this.state.change({ page: COMPONENTS_PAGE, focusedWidget: widget }, `open ${widget}`);
	}
}
