import { createElement as h } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata } from "@widgetarium/core";
import type { PropsOf } from "@widgetarium/core";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import { JobAskedSchema, LiveJobSchema } from "../../schemas/job.schema.js";
import { JobStatus } from "./ui/job-status.js";

const JobStatusWidget = createWidget({
	inject: {
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		getLiveJob: IQuery.input(JobAskedSchema).output(LiveJobSchema.nullable()),
		stopJob: ICommand.input(JobAskedSchema),
	},
	draw: (ports) => {
		const job = ports.getPages?.shownJob;
		return job ? <JobStatus job={job} ports={ports} /> : null;
	},
});

export type JobStatusPorts = PropsOf<typeof JobStatusWidget>;

export const metadata = defineMetadata(JobStatusWidget, {
	title: "Job status",
	description: "What the assistant's job on the shown page is doing, what it has spent, and a way to pause it.",
	keywords: ["design", "canvas", "job", "assistant", "status", "progress"],
	props: {
		getPages: { label: "Tabs", hint: "The page shown and the job running on it." },
		getLiveJob: { label: "Live job", hint: "What the running job is doing now." },
		stopJob: { label: "Pause a job", hint: "Pauses the running job." },
	},
});

export const layout = defineLayout({ role: "indicator", size: { preferredWidth: 480, preferredHeight: "auto" } });

export default JobStatusWidget;
