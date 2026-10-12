import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { jobStatusInject } from "../../widgets/job-status.widget.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import { useLiveJobAsked } from "./hooks/use-live-job-asked.js";
import { JobLine } from "./job-line.js";

export function JobStatus({ getPages, getLiveJob, stopJob }: InjectProps<typeof jobStatusInject>): ReactElement | null {
	const job = getPages?.shownJob ?? null;
	const { refusal, heard } = useRefusal();
	useLiveJobAsked(job?.id ?? null, getLiveJob.ask);
	if (!job) return null;
	return (
		<div
			className="cv:pointer-events-auto cv:rounded-xl cv:bg-page cv:px-4 cv:py-2.5 cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			data-canvas-chrome=""
		>
			<JobLine
				job={job}
				spent={getLiveJob.data?.spent ?? job.spent}
				isInline
				onStop={() => heard(stopJob({ id: job.id }))}
			/>
			<SaidLine said={refusal} />
		</div>
	);
}
