import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { countSaid, shareOf } from "../../lib/task-counts.js";

export interface CardProgressProps {
	readonly card: TaskCard;
}

const CRITERIA = "{done}/{total} criteria";
const STEPS = "{done}/{total} steps";
const TESTS = "tests {done}/{total} pass";

export function CardProgress({ card }: CardProgressProps): ReactElement {
	const { criteria, steps, tests } = card;
	return (
		<div className="wg-tasks-meta" data-tasks-progress="">
			<span>{countSaid(CRITERIA, criteria)}</span>
			<span className="wg-tasks-bar">
				<i style={{ width: shareOf(steps) }} />
			</span>
			<span className="wg-tasks-t3">
				{card.status === "ready_to_test" && tests !== null ? countSaid(TESTS, tests) : countSaid(STEPS, steps)}
			</span>
		</div>
	);
}
