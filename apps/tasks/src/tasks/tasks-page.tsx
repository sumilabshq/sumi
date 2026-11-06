import { createElement as h } from "react";
import type { ReactElement } from "react";
import { OnRefused, Slot, toastRefusal } from "@widgetarium/data-framework";
import { Toaster } from "@widgetarium/kit";
import { BOARD_ADDRESS } from "../features/tasks/lib/use-open-task.js";
import { TaskPage } from "../features/tasks/ui/task-page/task-page.js";
import { TasksHome } from "../features/tasks/ui/tasks-home/tasks-home.js";

export interface TasksPageProps {
	readonly address: string;
}

export function TasksPage({ address }: TasksPageProps): ReactElement {
	return (
		<div className="wg-root wg-tasks" data-tasks-page={address === BOARD_ADDRESS ? "board" : "task"}>
			<OnRefused value={toastRefusal}>
				<Toaster />
				<Slot>{address === BOARD_ADDRESS ? <TasksHome /> : <TaskPage task={address} />}</Slot>
			</OnRefused>
		</div>
	);
}
