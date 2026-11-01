import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { TasksMode, TasksView } from "../../lib/use-tasks-view.js";

export interface TasksModeSwitchProps {
	readonly view: TasksView;
}

const MODES: readonly { readonly value: TasksMode; readonly label: string }[] = [
	{
		value: "board",
		label: "Board",
	},
	{
		value: "list",
		label: "List",
	},
];

export function TasksModeSwitch({ view }: TasksModeSwitchProps): ReactElement {
	return (
		<span className="wg-tasks-mode" data-tasks-mode="">
			<Segmented<TasksMode> items={MODES} value={view.mode} onValueChange={view.showMode} size="s" />
		</span>
	);
}
