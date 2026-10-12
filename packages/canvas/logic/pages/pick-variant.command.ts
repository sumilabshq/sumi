import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { VariantPickSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class PickVariantCommand extends ICommand.input(VariantPickSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ page, screen }: z.output<typeof VariantPickSchema>): Promise<void> {
		this.state.change({ variants: { ...this.state.now().variants, [page]: screen } }, `show ${screen} on ${page}`);
	}
}
