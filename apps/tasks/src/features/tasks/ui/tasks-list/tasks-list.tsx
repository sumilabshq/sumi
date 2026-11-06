import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TaskStatusSchema, TasksQuery } from "@widgetarium/tasks";
import type { TaskCard, TaskStatus } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/framework";
import { useOpenTask } from "../../lib/use-open-task.js";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { TaskRow } from "./task-row.js";

export interface TasksListProps {
	readonly view: TasksView;
}

const LISTED_MOST = 200;
const MORE = "{count} more are not listed";

export function TasksList({ view }: TasksListProps): ReactElement {
	const page = useQuery(TasksQuery, {
		status: view.listStatus === null ? [] : [view.listStatus],
		updatedWithin: "month",
		owner: view.ask.owner,
		kind: view.ask.kind,
		limit: LISTED_MOST,
	}).data;
	const openTask = useOpenTask();

	return (
		<div className="wg-tasks-list" data-tasks-list="">
			{TaskStatusSchema.options.map((status: TaskStatus) => {
				const rows = page.items.filter((card: TaskCard) => card.status === status);
				return rows.length === 0 ? null : (
					<section key={status} className="wg-tasks-list-group" data-tasks-group={status}>
						<div className="wg-tasks-col-head">
							<StatusGlyph status={status} />
							<b>{rows[0]?.statusLabel}</b>
							<span className="wg-tasks-t3">{rows.length}</span>
						</div>
						{rows.map((card) => (
							<TaskRow key={card.id} card={card} openTask={openTask} />
						))}
					</section>
				);
			})}
			{page.next === null ? null : (
				<p className="wg-tasks-t3">{MORE.replace("{count}", String(page.total - page.items.length))}</p>
			)}
		</div>
	);
}
