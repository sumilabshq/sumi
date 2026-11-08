import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface StepDotsProps {
	readonly done: number;
	readonly total: number;
}

const MOST_DOTS = 8;
const STEPS_SAID = "{done} of {total} steps done";
const STEPS_COUNT = "{done}/{total}";

export function StepDots({ done, total }: StepDotsProps): ReactElement {
	const said = STEPS_SAID.replace("{done}", String(done)).replace("{total}", String(total));
	return (
		<span className="wg-studio-ai-live-task-dots" role="img" aria-label={said}>
			{total > MOST_DOTS
				? STEPS_COUNT.replace("{done}", String(done)).replace("{total}", String(total))
				: Array.from({ length: total }, (_, at) => <span key={at} className={dotClassOf(at, done)} />)}
		</span>
	);
}

function dotClassOf(at: number, done: number): string {
	if (at < done) {
		return "wg-studio-ai-live-task-dot is-done";
	}

	return at === done ? "wg-studio-ai-live-task-dot is-now" : "wg-studio-ai-live-task-dot";
}
