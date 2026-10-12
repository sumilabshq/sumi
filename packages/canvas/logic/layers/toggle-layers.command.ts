import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";

import { canvasSourceIn } from "../canvas/canvas-source.js";

export class ToggleLayersCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		const { state } = canvasSourceIn(this.ports);
		state.change({ isLayersOpen: !state.now().isLayersOpen }, "toggle layers");
	}
}
