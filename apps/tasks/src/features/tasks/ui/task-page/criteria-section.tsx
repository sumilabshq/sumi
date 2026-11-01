import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { Criterion, CriterionState } from "@widgetarium/tasks";
import { statesSaidOf } from "../../lib/task-counts.js";
import { CRITERION_WORDS } from "../../lib/task-words.js";

export interface CriteriaListProps {
	readonly criteria: readonly Criterion[];
}

const SHOWN_STATES: readonly CriterionState[] = ["met", "dropped", "open"];

export function criteriaSaidOf(criteria: readonly Criterion[]): string {
	return statesSaidOf(
		criteria.map((criterion) => criterion.state),
		SHOWN_STATES,
		CRITERION_WORDS,
	);
}

export function CriteriaList({ criteria }: CriteriaListProps): ReactElement {
	return (
		<Fragment>
			{criteria.map((criterion) => (
				<div key={criterion.id} className="wg-tasks-li" data-state={criterion.state}>
					<span className="wg-tasks-box" data-state={criterion.state} />
					<div className={criterion.state === "dropped" ? "wg-tasks-t2" : undefined}>
						<span className="wg-tasks-li-text">{criterion.text}</span>
						{criterion.evidence === null ? null : <div className="wg-tasks-ev">Evidence: {criterion.evidence}</div>}
						{criterion.reason === null ? null : <div className="wg-tasks-ev">Dropped: {criterion.reason}</div>}
					</div>
				</div>
			))}
		</Fragment>
	);
}
