import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { RendererAskSchema } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class ChooseRendererCommand extends ICommand.input(RendererAskSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ renderer }: z.output<typeof RendererAskSchema>): Promise<void> {
		canvasSourceIn(this.ports).state.change({ renderer }, `draw pages as ${renderer}`);
	}
}
