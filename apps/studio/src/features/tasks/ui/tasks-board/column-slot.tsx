import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { BoardColumn as Column } from "@widgetarium/tasks";
import type { OpenTask } from "../../lib/use-open-task.js";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { BoardColumn } from "./board-column.js";
import { FoldedStrip } from "./folded-strip.js";

export interface ColumnSlotProps {
	readonly column: Column;
	readonly view: TasksView;
	readonly openTask: OpenTask;
	readonly isFolded: boolean;
	readonly isPicked: boolean;
	readonly toggle: () => void;
}

export function ColumnSlot({ column, view, openTask, isFolded, isPicked, toggle }: ColumnSlotProps): ReactElement {
	const place = (
		<div
			className="wg-tasks-col-place"
			data-tasks-glide={`place:${column.status}`}
			data-picked={isPicked ? "" : undefined}
			data-folded={isFolded ? "" : undefined}
		>
			<BoardColumn column={column} view={view} openTask={openTask} fold={toggle} />
		</div>
	);

	if (!isFolded) {
		return place;
	}

	return (
		<Fragment>
			<FoldedStrip column={column} closedWithin={view.ask.closedWithin} unfold={toggle} />
			{isPicked ? place : null}
		</Fragment>
	);
}
