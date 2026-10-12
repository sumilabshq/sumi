import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { LookPickSchema } from "../../schemas/look.schema.js";
import type { LookPick } from "../../schemas/look.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { sourceChanged } from "../design/design-reads.js";

export class PickLookCommand extends ICommand.input(LookPickSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ settingName, option }: LookPick): Promise<void> {
		const { design, app } = canvasSourceIn(this.ports);
		await design.pickLook(app, settingName, option);
		sourceChanged(design, app);
	}
}
