import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";

export interface ReadyLineSaidProps {
	readonly card: TaskCard;
}

const READY = "Ready to test · {title}";
const OPEN = "Open";

export function ReadyLineSaid({ card }: ReadyLineSaidProps): ReactElement {
	return (
		<Fragment>
			<span className="wg-tasks-mono">{card.id}</span>
			<span className="wg-tasks-ell">{READY.replace("{title}", card.title)}</span>
			<span className="wg-tasks-line-open">{OPEN}</span>
		</Fragment>
	);
}
