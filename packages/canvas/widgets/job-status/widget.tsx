import { createElement as h } from "react";
import {
	ICommand,
	IQuery,
	PageInputSchema,
	PageOf,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
} from "@widgetarium/core";
import type { PropsOf } from "@widgetarium/core";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import { JobAskedSchema, JobSchema, LiveJobSchema } from "../../schemas/job.schema.js";
import { JobStatus } from "./ui/job-status.js";

const JOBS_AT_MOST = 100;

const JobStatusWidget = createWidget({
	inject: {
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		getJobs: IQuery.input(PageInputSchema).output(PageOf(JobSchema)),
		getLiveJob: IQuery.input(JobAskedSchema).output(LiveJobSchema.nullable()),
		stopJob: ICommand.input(JobAskedSchema),
	},
	draw: (ports) => {
		const { data: jobs } = useData(ports.getJobs, { limit: JOBS_AT_MOST });
		const running = ports.getPages?.running[ports.getPages.shown];
		const job = jobs.find((one) => one.id === running);
		return job ? <JobStatus job={job} ports={ports} /> : null;
	},
});

export type JobStatusPorts = PropsOf<typeof JobStatusWidget>;

export const metadata = defineMetadata(JobStatusWidget, {
	title: "Job status",
	description: "What the assistant's job on the shown page is doing, what it has spent, and a way to pause it.",
	keywords: ["design", "canvas", "job", "assistant", "status", "progress"],
	props: {
		getPages: { label: "Tabs", hint: "The page shown and the job running on each page." },
		getJobs: { label: "Jobs", hint: "The assistant's jobs on this app." },
		getLiveJob: { label: "Live job", hint: "What the running job is doing now." },
		stopJob: { label: "Pause a job", hint: "Pauses the running job." },
	},
});

export const layout = defineLayout({ role: "indicator", size: { preferredWidth: 480, preferredHeight: "auto" } });

export default JobStatusWidget;
