import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { ModeAskSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class SetModeCommand extends ICommand.input(ModeAskSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ mode }: z.output<typeof ModeAskSchema>): Promise<void> {
		this.state.change({ mode }, `${mode} mode`);
	}
}
