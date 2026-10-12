import type { z } from "zod";
import { IQuery } from "@widgetarium/core";
import { JobAskedSchema, LiveJobSchema } from "../../schemas/job.schema.js";
import type { LiveJob } from "../../schemas/job.schema.js";
import type { DesignSource } from "../design/design-source.js";

export class LiveJobQuery extends IQuery.input(JobAskedSchema).output(LiveJobSchema.nullable()) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
	) {
		super();
	}

	async query({ id }: z.output<typeof JobAskedSchema>): Promise<LiveJob | null> {
		return this.source.liveJob(this.app, id);
	}

	override subscribe(changed: () => void): () => void {
		return this.source.onJobs(changed);
	}
}
