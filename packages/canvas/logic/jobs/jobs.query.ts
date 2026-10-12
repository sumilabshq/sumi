import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { PageInputSchema, PageOf } from "@widgetarium/core";
import { offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import type { Page, PageInput } from "@widgetarium/core";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { JobSchema } from "../../schemas/job.schema.js";
import type { Job } from "../../schemas/job.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class JobsQuery extends IQuery.input(PageInputSchema).output(PageOf(JobSchema)) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query({ cursor, limit }: PageInput): Promise<Page<Job>> {
		const { design, app } = canvasSourceIn(this.ports);
		const jobs = design.jobs(app);
		const offset = offsetOfCursor(cursor);
		return pageAt(jobs.slice(offset, offset + limit), offset, jobs.length);
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).design.onJobs(changed);
	}
}
