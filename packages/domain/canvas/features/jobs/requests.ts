import { PerCall } from "@widgetarium/data-framework";
import { query, command, subscriber } from "#module";
import { jobsChanged } from "../../gateways/agent-jobs/agent-jobs.events.js";
import { canvasMomentChanged } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { designChanged } from "../../gateways/design-folder/design-folder.events.js";
import { JobIdSchema, JobStatusSchema } from "../../shared/schema/job.schema.js";
import { PAGE_FIELDS, pagesNowOf } from "../../shared/lib/pages/pages-now.js";
import { isTouching } from "../../shared/lib/view/canvas-moment.js";

export const jobStatus = query()
	.public()
	.output(JobStatusSchema)
	.handle(async (_input, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const { app, pages } = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		const job = pages.shownJob;

		if (!job) {
			return { shown: null };
		}

		const live = agentJobs.liveJob(app, job.id);
		return {
			shown: {
				job,
				spent: live ? live.spent : job.spent,
			},
		};
	});

export const stopJob = command()
	.public()
	.input(JobIdSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ id }, { canvasMoment, agentJobs }) => {
		const { app } = canvasMoment.moment();
		await agentJobs.stopJob(app, id);
		console.info(`[widgetarium] job ${id} of ${app} running → stopped (stop pressed)`);
	});

export const rereadJobStatusForMoment = subscriber(canvasMomentChanged).handle(({ fields }, { invalidate }) => {
	if (isTouching(fields, PAGE_FIELDS)) {
		invalidate(jobStatus);
	}
});

export const rereadJobStatusForDesign = subscriber(designChanged).handle((_input, { invalidate }) => {
	invalidate(jobStatus);
});

export const rereadJobStatus = subscriber(jobsChanged).handle((_input, { invalidate }) => {
	invalidate(jobStatus);
});
