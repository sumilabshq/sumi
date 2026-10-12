import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { RendererAskSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class ChooseRendererCommand extends ICommand.input(RendererAskSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ renderer }: z.output<typeof RendererAskSchema>): Promise<void> {
		this.state.change({ renderer }, `draw pages as ${renderer}`);
	}
}
