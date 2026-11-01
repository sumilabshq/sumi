import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { TaskProps } from "./task-props.js";

export interface TaskSideProps {
	readonly view: TaskView;
}

export function TaskSide({ view }: TaskSideProps): ReactElement {
	return (
		<aside className="wg-tasks-side" data-tasks-side="">
			<TaskProps view={view} />
		</aside>
	);
}
