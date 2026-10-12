import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { SelectAskSchema } from "../../schemas/selection.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class SelectCommand extends ICommand.input(SelectAskSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ selection }: z.output<typeof SelectAskSchema>): Promise<void> {
		canvasSourceIn(this.ports).state.change({ selection }, selection ? `pick ${selection.mark}` : "clear the pick");
	}
}
