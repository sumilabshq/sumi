import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { JobAskedSchema } from "../../schemas/job.schema.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";

export class StopJobCommand extends ICommand.input(JobAskedSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
	) {
		super();
	}

	run({ id }: z.output<typeof JobAskedSchema>): Promise<void> {
		return this.source.stopJob(this.state.now().app, id);
	}
}
