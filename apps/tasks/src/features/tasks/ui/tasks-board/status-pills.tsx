import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BoardColumn, TaskStatus } from "@widgetarium/tasks";
import { Segmented } from "@widgetarium/kit";
import { StatusGlyph } from "../status-glyph/status-glyph.js";

export interface StatusPillsProps {
	readonly columns: readonly BoardColumn[];
	readonly picked: TaskStatus;
	readonly pick: (status: TaskStatus) => void;
}

export function StatusPills({ columns, picked, pick }: StatusPillsProps): ReactElement {
	return (
		<div className="wg-tasks-pills" data-tasks-pills="">
			<Segmented<TaskStatus>
				items={columns.map((column) => ({
					value: column.status,
					label: (
						<span className="wg-tasks-inline">
							<StatusGlyph status={column.status} />
							{`${column.label} ${column.total}`}
						</span>
					),
				}))}
				value={picked}
				onValueChange={pick}
				size="s"
				variant="plain"
			/>
		</div>
	);
}
