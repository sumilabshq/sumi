import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Spinner, useNow } from "@widgetarium/kit";
import { doingOf } from "@widgetarium/core/job-words.js";
import type { Job } from "../../schema/job.schema.js";

export interface JobLineProps {
	readonly job: Job;
	readonly spent?: number | undefined;
	readonly isInline?: boolean | undefined;
	readonly onStop?: (() => void) | undefined;
}

const PAUSE = "Pause";
const TOKENS = "{tokens} tokens";
const MINUTES = "{minutes} min";
const MS_PER_MINUTE = 60000;
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function JobLine({ job, spent = job.spent, isInline = false, onStop }: JobLineProps): ReactElement {
	const now = useNow(1000, true);
	const minutes = job.startedAt === null ? null : Math.max(1, Math.round((now - job.startedAt) / MS_PER_MINUTE));
	const meta = [
		spent > 0 ? TOKENS.replace("{tokens}", COMPACT.format(spent)) : null,
		minutes === null ? null : MINUTES.replace("{minutes}", String(minutes)),
	].filter((part): part is string => part !== null);
	return (
		<div
			className={
				isInline
					? "cv:flex cv:flex-row cv:items-baseline cv:gap-3.5 cv:text-[19px]"
					: "cv:flex cv:flex-col cv:gap-1.5 cv:text-[19px]"
			}
			data-wg-job={job.id}
			data-canvas-job-line={isInline ? "inline" : "block"}
		>
			<div className="cv:flex cv:items-center cv:gap-[13px] cv:text-ink">
				<Spinner size={18} />
				<span>{doingOf(job)}</span>
			</div>
			<div
				className={`cv:flex cv:items-baseline cv:gap-2 cv:text-[15px] cv:text-muted-foreground cv:tabular-nums ${isInline ? "" : "cv:ps-[31px]"}`}
			>
				<span>{[...meta, ""].join(" · ")}</span>
				{onStop ? (
					<button
						type="button"
						className="cv:-mx-2 cv:-my-[3px] cv:cursor-pointer cv:rounded-lg cv:border-0 cv:bg-transparent cv:px-2 cv:py-[3px] cv:font-[inherit] cv:text-[length:inherit] cv:font-semibold cv:text-muted-foreground cv:shadow-none cv:transition-colors cv:hover:bg-fill cv:hover:text-ink cv:focus-visible:bg-fill cv:focus-visible:outline-none cv:active:scale-[0.96]"
						onClick={onStop}
					>
						{PAUSE}
					</button>
				) : null}
			</div>
		</div>
	);
}
