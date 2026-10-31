import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";

export interface PausedLineSaidProps {
	readonly card: TaskCard;
}

const PAUSED = "Paused";

export function PausedLineSaid({ card }: PausedLineSaidProps): ReactElement {
	return (
		<Fragment>
			<span className="wg-tasks-t2">{PAUSED}</span>
			<span className="wg-tasks-mono">{card.id}</span>
			<span className="wg-tasks-ell wg-tasks-t2">{card.note === null ? card.title : `· ${card.note}`}</span>
		</Fragment>
	);
}
