import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TaskQuery } from "@widgetarium/tasks";
import { useOptionalQuery } from "@widgetarium/framework";
import { TaskGone } from "./task-gone.js";
import { TaskShown } from "./task-shown.js";

export interface TaskPageProps {
	readonly task: string;
}

export function TaskPage({ task }: TaskPageProps): ReactElement | null {
	const read = useOptionalQuery(TaskQuery, { task });

	if (read.failure !== null) {
		return <TaskGone task={task} />;
	}

	return read.data === null ? null : <TaskShown view={read.data} />;
}
