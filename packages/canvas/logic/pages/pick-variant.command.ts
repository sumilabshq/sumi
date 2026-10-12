import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { VariantPickSchema } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class PickVariantCommand extends ICommand.input(VariantPickSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ page, screen }: z.output<typeof VariantPickSchema>): Promise<void> {
		const { state } = canvasSourceIn(this.ports);
		state.change({ variants: { ...state.now().variants, [page]: screen } }, `show ${screen} on ${page}`);
	}
}
