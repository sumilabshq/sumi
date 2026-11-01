import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { BOARD_ADDRESS, useOpenTask } from "../../lib/use-open-task.js";
import { TaskHeader } from "./task-header.js";

export interface TaskGoneProps {
	readonly task: string;
}

const GONE = "This task is gone";
const BACK = "Back to the board";

export function TaskGone({ task }: TaskGoneProps): ReactElement {
	const openTask = useOpenTask();
	return (
		<div className="wg-tasks-gone" data-tasks-gone={task}>
			<TaskHeader owner={null} isNarrow={false} />
			<p className="wg-tasks-t2">{GONE}</p>
			<Button variant="ghost" size="s" data-tasks-gone-back="" onClick={() => openTask(BOARD_ADDRESS)}>
				{BACK}
			</Button>
		</div>
	);
}
