import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { JobAskedSchema, LiveJobSchema } from "../schemas/job.schema.js";
import { JobStatus } from "../ui/job-status/job-status.js";

export const jobStatusInject = inject({
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	getLiveJob: IQuery.input(JobAskedSchema).output(LiveJobSchema.nullable()),
	stopJob: ICommand.input(JobAskedSchema),
});

export const JobStatusWidget = widget().inject(jobStatusInject).render(JobStatus);
