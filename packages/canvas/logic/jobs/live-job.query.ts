import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { JobAskedSchema, LiveJobSchema } from "../../schemas/job.schema.js";
import type { LiveJob } from "../../schemas/job.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class LiveJobQuery extends IQuery.input(JobAskedSchema).output(LiveJobSchema.nullable()) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query({ id }: z.output<typeof JobAskedSchema>): Promise<LiveJob | null> {
		const { design, app } = canvasSourceIn(this.ports);
		return design.liveJob(app, id);
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).design.onJobs(changed);
	}
}
