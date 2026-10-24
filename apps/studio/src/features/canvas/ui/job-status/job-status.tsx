import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { JobStatusQuery } from "@widgetarium/canvas";
import { StopJobCommand } from "@widgetarium/canvas";
import { JobLine } from "./job-line.js";

export function JobStatus(): ReactElement | null {
	const { shown } = useQuery(JobStatusQuery).data;
	const stop = useCommand(StopJobCommand);

	if (!shown) return null;

	return (
		<div
			className="cv:pointer-events-auto cv:rounded-xl cv:bg-page cv:px-4 cv:py-2.5 cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			data-canvas-chrome=""
		>
			<JobLine job={shown.job} spent={shown.spent} isInline onStop={() => void stop.run({ id: shown.job.id })} />
		</div>
	);
}
