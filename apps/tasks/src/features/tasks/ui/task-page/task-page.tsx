import { createElement as h } from "react";
import type { ReactElement } from "react";
import { tasks } from "@widgetarium/tasks/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { TaskGone } from "./task-gone.js";
import { TaskShown } from "./task-shown.js";

export interface TaskPageProps {
	readonly task: string;
}

export function TaskPage({ task }: TaskPageProps): ReactElement | null {
	const read = useOptionalQuery(tasks.board.task, { task });

	if (read.failure !== null) {
		return <TaskGone task={task} />;
	}

	return read.data === null ? null : <TaskShown view={read.data} />;
}
