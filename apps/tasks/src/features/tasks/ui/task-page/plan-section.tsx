import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { Step, StepState } from "@widgetarium/tasks";
import { statesSaidOf } from "../../lib/task-counts.js";
import { STEP_WORDS } from "../../lib/task-words.js";

export interface PlanListProps {
	readonly plan: readonly Step[];
}

const SHOWN_STATES: readonly StepState[] = ["done", "active", "skipped", "blocked", "cancelled", "pending"];
const QUIET_STATES: ReadonlySet<StepState> = new Set(["skipped", "cancelled"]);

export function planSaidOf(plan: readonly Step[]): string {
	return statesSaidOf(
		plan.map((step) => step.state),
		SHOWN_STATES,
		STEP_WORDS,
	);
}

export function PlanList({ plan }: PlanListProps): ReactElement {
	return (
		<Fragment>
			{plan.map((step) => (
				<div key={step.id} className="wg-tasks-li" data-state={step.state}>
					<span className="wg-tasks-dot" data-state={step.state} />
					<span className={QUIET_STATES.has(step.state) ? "wg-tasks-t2" : undefined}>
						{step.text}
						{step.note === null ? null : <span className="wg-tasks-t3">{` · ${step.note}`}</span>}
					</span>
					<span className="wg-tasks-t3 wg-tasks-small">{step.by ?? ""}</span>
				</div>
			))}
		</Fragment>
	);
}
