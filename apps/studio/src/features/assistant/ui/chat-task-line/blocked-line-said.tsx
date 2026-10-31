import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";

export interface BlockedLineSaidProps {
	readonly card: TaskCard;
}

const BLOCKED = "Blocked · {note}";

export function BlockedLineSaid({ card }: BlockedLineSaidProps): ReactElement {
	return (
		<Fragment>
			<span className="wg-tasks-mono">{card.id}</span>
			<span className="wg-tasks-ell wg-tasks-line-blocked">{BLOCKED.replace("{note}", card.note ?? card.title)}</span>
		</Fragment>
	);
}
