import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { countSaid } from "../../lib/task-counts.js";
import { ageOf } from "../../lib/task-times.js";
import type { OpenTask } from "../../lib/use-open-task.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";

export interface TaskRowProps {
	readonly card: TaskCard;
	readonly openTask: OpenTask;
}

const CRITERIA = "{done}/{total} criteria";

export function TaskRow({ card, openTask }: TaskRowProps): ReactElement {
	return (
		<button type="button" className="wg-tasks-row" data-tasks-row={card.id} onClick={() => openTask(card.id)}>
			<StatusGlyph status={card.status} />
			<span className="wg-tasks-mono wg-tasks-t2">{card.id}</span>
			<span className="wg-tasks-ell">
				<span>{card.title}</span>
				{card.note === null ? null : (
					<span className="wg-tasks-why" data-status={card.status}>
						{` · ${card.note}`}
					</span>
				)}
			</span>
			<span className="wg-tasks-t2">{countSaid(CRITERIA, card.criteria)}</span>
			<span className="wg-tasks-row-branch">
				{card.branch === null ? null : <span className="wg-tasks-chip wg-tasks-mono">{card.branch}</span>}
			</span>
			<span className="wg-tasks-t3">{ageOf(card.updatedAt, Date.now())}</span>
		</button>
	);
}
