import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { PageAskSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";
import { showPage } from "./show-page.js";

export class ShowPageCommand extends ICommand.input(PageAskSchema) {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run({ page }: z.output<typeof PageAskSchema>): Promise<void> {
		showPage(this.state, page);
	}
}
