import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { COMPONENTS_PAGE } from "../../schemas/canvas-page.schema.js";
import { WidgetFocusSchema } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class FocusWidgetCommand extends ICommand.input(WidgetFocusSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget }: z.output<typeof WidgetFocusSchema>): Promise<void> {
		const { state } = canvasSourceIn(this.ports);
		if (widget === null) return state.change({ focusedWidget: null }, "flown to the widget");
		const shown = { page: COMPONENTS_PAGE, keptPage: COMPONENTS_PAGE };
		state.change({ ...shown, selection: null, focusedWidget: widget }, `open ${widget}`);
	}
}
