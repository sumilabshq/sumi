import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { BoardQuery } from "@widgetarium/tasks";
import type { BoardColumn as Column, TaskStatus } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/framework";
import { useGlidesBoard } from "../../lib/use-glides-board.js";
import { useRereadsAtContinue } from "../../lib/use-rereads-at-continue.js";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { ColumnSlot } from "./column-slot.js";
import { StatusPills } from "./status-pills.js";
import { WaitingFirst } from "./waiting-first.js";

export interface TasksBoardProps {
	readonly view: TasksView;
}

const FIRST_FOLDED: ReadonlySet<TaskStatus> = new Set(["backlog", "paused", "cancelled"]);
const FIRST_PICKED: TaskStatus = "in_progress";

export function TasksBoard({ view }: TasksBoardProps): ReactElement {
	const { columns } = useQuery(BoardQuery, view.ask).data;
	useRereadsAtContinue(columns.flatMap((column) => column.cards));
	const [folded, setFolded] = useState(FIRST_FOLDED);
	const [picked, setPicked] = useState(FIRST_PICKED);
	const board = useRef<HTMLDivElement>(null);
	useGlidesBoard(board);
	const toggle = (status: TaskStatus): void => setFolded((was) => withToggled(was, status));

	return (
		<div ref={board} className="wg-tasks-board" data-tasks-board="">
			<WaitingFirst columns={columns} />
			<StatusPills columns={columns} picked={picked} pick={setPicked} />
			<div className="wg-tasks-columns">
				{columns.map((column: Column) => (
					<ColumnSlot
						key={column.status}
						column={column}
						view={view}
						isFolded={folded.has(column.status)}
						isPicked={column.status === picked}
						toggle={() => toggle(column.status)}
					/>
				))}
			</div>
		</div>
	);
}

function withToggled(folded: ReadonlySet<TaskStatus>, status: TaskStatus): ReadonlySet<TaskStatus> {
	const next = new Set(folded);

	if (!next.delete(status)) {
		next.add(status);
	}

	return next;
}
