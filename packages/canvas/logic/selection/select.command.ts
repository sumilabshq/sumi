import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { SelectAskSchema } from "../../schemas/selection.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class SelectCommand extends ICommand.input(SelectAskSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ selection }: z.output<typeof SelectAskSchema>): Promise<void> {
		this.state.change({ selection }, selection ? `pick ${selection.mark}` : "clear the pick");
	}
}
