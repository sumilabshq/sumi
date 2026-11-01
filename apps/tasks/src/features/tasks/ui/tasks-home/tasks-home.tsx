import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/core/requests";
import { PlateHeaderPart } from "../../../plate/ui/plate-header-part.js";
import { useTasksView } from "../../lib/use-tasks-view.js";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { TasksBoard } from "../tasks-board/tasks-board.js";
import { SearchHits } from "../tasks-list/search-hits.js";
import { TasksList } from "../tasks-list/tasks-list.js";
import { TasksControls } from "./tasks-controls.js";

export function TasksHome(): ReactElement {
	const view = useTasksView();
	return (
		<Fragment>
			<PlateHeaderPart place="controls">
				<Slot loading={null}>
					<TasksControls view={view} />
				</Slot>
			</PlateHeaderPart>
			<Slot>{bodyOf(view)}</Slot>
		</Fragment>
	);
}

function bodyOf(view: TasksView): ReactElement {
	const search = view.search.trim();

	if (search !== "") {
		return <SearchHits search={search} />;
	}

	return view.mode === "board" ? <TasksBoard view={view} /> : <TasksList view={view} />;
}
