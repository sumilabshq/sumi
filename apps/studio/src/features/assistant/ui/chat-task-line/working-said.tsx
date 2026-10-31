import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { countSaid, shareOf } from "../../../tasks/lib/task-counts.js";

export interface WorkingSaidProps {
	readonly card: TaskCard;
}

const WORKING_ON = "Working on";
const NEXT_STEP_LINE = "· {step}";
const STEPS = "{done}/{total}";

export function WorkingSaid({ card }: WorkingSaidProps): ReactElement {
	return (
		<Fragment>
			<span className="wg-tasks-t2 wg-tasks-line-lead">{WORKING_ON}</span>
			<span className="wg-tasks-mono">{card.id}</span>
			<span className="wg-tasks-ell wg-tasks-line-title">{card.title}</span>
			{card.nextStep === null ? null : (
				<span className="wg-tasks-ell wg-tasks-t3 wg-tasks-line-next">
					{NEXT_STEP_LINE.replace("{step}", card.nextStep)}
				</span>
			)}
			<span className="wg-tasks-bar wg-tasks-line-bar">
				<i style={{ width: shareOf(card.steps) }} />
			</span>
			<span className="wg-tasks-t3">{countSaid(STEPS, card.steps)}</span>
		</Fragment>
	);
}
