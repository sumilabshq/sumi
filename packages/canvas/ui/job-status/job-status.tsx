import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import type { AskedView } from "@widgetarium/core";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { LiveJob } from "../../schemas/job.schema.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import type { Act } from "../said-line/use-refusal.js";
import { JobLine } from "./job-line.js";

interface JobAsked {
	readonly id: string;
}

export interface JobStatusProps {
	readonly getPages: CanvasPages | null;
	readonly getLiveJob: AskedView<JobAsked, LiveJob | null>;
	readonly stopJob: Act<JobAsked>;
}

export function JobStatus({ getPages, getLiveJob, stopJob }: JobStatusProps): ReactElement | null {
	const job = getPages?.shownJob ?? null;
	const { refusal, heard } = useRefusal();
	const { ask } = getLiveJob;
	useEffect(() => {
		if (job) ask({ id: job.id });
	}, [job?.id, ask]);
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
