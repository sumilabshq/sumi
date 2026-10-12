import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { JobAskedSchema, ShownJobSchema } from "../schemas/job.schema.js";
import { JobStatus } from "../ui/job-status/job-status.js";

export const jobStatusInject = inject({
	liveJobQuery: IQuery.output(ShownJobSchema.nullable().default(null)),
	stopJobCommand: ICommand.input(JobAskedSchema),
});

export const JobStatusWidget = widget().inject(jobStatusInject).render(JobStatus);
