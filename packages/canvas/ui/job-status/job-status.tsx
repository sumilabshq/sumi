import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { jobStatusInject } from "../../widgets/job-status.widget.js";
import { JobLine } from "./job-line.js";

export function JobStatus({
	liveJobQuery: { data: shown },
	stopJobCommand,
}: InjectProps<typeof jobStatusInject>): ReactElement | null {
	if (!shown) return null;
	const { job, spent } = shown;
	return (
		<div
			className="cv:pointer-events-auto cv:rounded-xl cv:bg-page cv:px-4 cv:py-2.5 cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			data-canvas-chrome=""
		>
			<JobLine job={job} spent={spent} isInline onStop={() => void stopJobCommand.run({ id: job.id })} />
		</div>
	);
}
