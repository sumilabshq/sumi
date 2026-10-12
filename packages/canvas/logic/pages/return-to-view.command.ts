import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { readPages } from "./read-pages.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class ReturnToViewCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		const source = canvasSourceIn(this.ports);
		const { shown } = await readPages(source);
		await source.design.returnToView(source.app, shown);
	}
}
