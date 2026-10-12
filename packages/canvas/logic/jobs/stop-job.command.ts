import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { JobAskedSchema } from "../../schemas/job.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class StopJobCommand extends ICommand.input(JobAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run({ id }: z.output<typeof JobAskedSchema>): Promise<void> {
		const { design, app } = canvasSourceIn(this.ports);
		return design.stopJob(app, id);
	}
}
