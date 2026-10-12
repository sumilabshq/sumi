import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { ModeAskSchema } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class SetModeCommand extends ICommand.input(ModeAskSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ mode }: z.output<typeof ModeAskSchema>): Promise<void> {
		canvasSourceIn(this.ports).state.change({ mode }, `${mode} mode`);
	}
}
