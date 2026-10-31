import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Input } from "@widgetarium/kit";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { AgentsMenu } from "./agents-menu.js";
import { KindFilter } from "./kind-filter.js";
import { TasksModeSwitch } from "./tasks-mode-switch.js";
import { WaitingToggle } from "./waiting-toggle.js";

export interface TasksControlsProps {
	readonly view: TasksView;
}

export function TasksControls({ view }: TasksControlsProps): ReactElement {
	return (
		<div className="wg-root wg-tasks-head" data-tasks-controls="">
			<TasksModeSwitch view={view} />
			<span className="wg-tasks-fill" />
			<WaitingToggle view={view} />
			<AgentsMenu view={view} />
			<KindFilter view={view} />
			<span className="wg-tasks-search">
				<Input
					size="s"
					block
					icon={<Icon name="search" size={16} />}
					aria-label="Search tasks"
					placeholder="Search"
					value={view.search}
					onChange={(event) => view.searchFor(event.target.value)}
				/>
			</span>
		</div>
	);
}
