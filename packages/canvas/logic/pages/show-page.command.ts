import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import type { z } from "zod";
import { PageAskSchema } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { showPage } from "./show-page.js";

export class ShowPageCommand extends ICommand.input(PageAskSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ page }: z.output<typeof PageAskSchema>): Promise<void> {
		showPage(canvasSourceIn(this.ports).state, page);
	}
}
