import { PerCall } from "@widgetarium/data-framework";
import { query, command, subscriber } from "#module";
import { JobsChangedEvent } from "../../gateways/agent-jobs/agent-jobs.events.js";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { JobIdSchema, JobStatusSchema } from "../../shared/schema/job.schema.js";
import { PAGE_FIELDS, pagesNowOf } from "../../shared/lib/pages/pages-now.js";
import { isTouching } from "../../shared/lib/view/canvas-moment.js";

export const JobStatusQuery = query("job-status")
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

export const StopJobCommand = command("stop-job")
	.public()
	.input(JobIdSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ id }, { canvasMoment, agentJobs }) => {
		const { app } = canvasMoment.moment();
		await agentJobs.stopJob(app, id);
		console.info(`[widgetarium] job ${id} of ${app} running → stopped (stop pressed)`);
	});

export const RereadJobStatusForMomentSubscriber = subscriber(CanvasMomentChangedEvent).handle(
	({ fields }, { invalidate }) => {
		if (isTouching(fields, PAGE_FIELDS)) {
			invalidate(JobStatusQuery);
		}
	},
);

export const RereadJobStatusForDesignSubscriber = subscriber(DesignChangedEvent).handle((_input, { invalidate }) => {
	invalidate(JobStatusQuery);
});

export const RereadJobStatusSubscriber = subscriber(JobsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(JobStatusQuery);
});
