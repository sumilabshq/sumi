import { IQuery } from "@widgetarium/core";
import { ShownJobSchema } from "../../schemas/job.schema.js";
import type { ShownJob } from "../../schemas/job.schema.js";
import type { DesignSource } from "../design/design-source.js";
import { readPages, watchPages } from "../pages/read-pages.js";
import type { CanvasState } from "../view/canvas-state.js";

export class LiveJobQuery extends IQuery.output(ShownJobSchema.nullable()) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
		private readonly state: CanvasState,
	) {
		super();
	}

	async get(): Promise<ShownJob | null> {
		const { shownJob } = await readPages(this.source, this.app, this.state);
		if (!shownJob) return null;
		const live = this.source.liveJob(this.app, shownJob.id);
		return { job: shownJob, spent: live ? live.spent : shownJob.spent };
	}

	override subscribe(changed: () => void): () => void {
		return watchPages(this.source, this.app, this.state, changed);
	}
}
