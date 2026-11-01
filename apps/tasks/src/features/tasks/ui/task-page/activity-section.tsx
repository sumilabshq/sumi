import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { LogEntry } from "@widgetarium/tasks";
import { ageOf } from "../../lib/task-times.js";
import { ActorSaid } from "./actor-said.js";

export interface ActivityListProps {
	readonly log: readonly LogEntry[];
}

const CREATED = "Created as {status}";

export function ActivityList({ log }: ActivityListProps): ReactElement {
	return (
		<Fragment>
			{[...log].reverse().map((transition) => (
				<div key={`${transition.at}-${transition.to}`} className="wg-tasks-log">
					<span className="wg-tasks-t3">{ageOf(transition.at, Date.now())}</span>
					<span>
						<b className="wg-tasks-strong">{movedOf(transition)}</b>
						{" · "}
						<ActorSaid actor={transition.by} />
						{transition.reason === "" ? null : <span className="wg-tasks-t2">{` · “${transition.reason}”`}</span>}
					</span>
				</div>
			))}
		</Fragment>
	);
}

function movedOf({ fromLabel, toLabel }: LogEntry): string {
	return fromLabel === null ? CREATED.replace("{status}", toLabel) : `${fromLabel} → ${toLabel}`;
}
