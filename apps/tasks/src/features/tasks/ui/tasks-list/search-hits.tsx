import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SearchTasksQuery } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/core/requests";
import { useOpenTask } from "../../lib/use-open-task.js";
import { TaskRow } from "./task-row.js";

export interface SearchHitsProps {
	readonly search: string;
}

const NOTHING_FOUND = "No task matches “{search}”.";

export function SearchHits({ search }: SearchHitsProps): ReactElement {
	const hits = useQuery(SearchTasksQuery, {
		query: search,
		includeClosed: true,
	}).data;
	const openTask = useOpenTask();
	return (
		<div className="wg-tasks-list" data-tasks-search="">
			{hits.length === 0 ? <p className="wg-tasks-t2">{NOTHING_FOUND.replace("{search}", search)}</p> : null}
			{hits.map((card) => (
				<TaskRow key={card.id} card={card} openTask={openTask} />
			))}
		</div>
	);
}
