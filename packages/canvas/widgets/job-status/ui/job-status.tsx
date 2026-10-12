import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useData } from "@widgetarium/core";
import type { Job } from "../../../schemas/job.schema.js";
import type { JobStatusPorts } from "../widget.js";
import { SaidLine } from "../../canvas-ui/said-line.js";
import { useRefusal } from "../../canvas-ui/use-refusal.js";
import { JobLine } from "./job-line.js";

export function JobStatus({ job, ports }: { readonly job: Job; readonly ports: JobStatusPorts }): ReactElement {
	const { data: live, failure } = useData(ports.getLiveJob, { id: job.id });
	const { refusal, heard } = useRefusal();
	return (
		<div
			className="cv:pointer-events-auto cv:rounded-xl cv:bg-page cv:px-4 cv:py-2.5 cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			data-canvas-chrome=""
		>
			<JobLine
				job={job}
				spent={live?.spent ?? job.spent}
				isInline
				onStop={() => heard(ports.stopJob({ id: job.id }))}
			/>
			<SaidLine said={failure ?? refusal} />
		</div>
	);
}
