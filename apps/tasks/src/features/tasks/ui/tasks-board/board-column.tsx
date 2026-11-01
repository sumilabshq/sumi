import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BoardColumn as Column, TaskCard as Card } from "@widgetarium/tasks";
import { Button, Icon, IconButton } from "@widgetarium/kit";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { TaskCard } from "../task-card/task-card.js";
import { ClosedMenu } from "./closed-menu.js";

export interface BoardColumnProps {
	readonly column: Column;
	readonly view: TasksView;
	readonly fold: () => void;
}

const FOLD = "Fold the {status} column";
const YOUR_TURN = "your turn";
const OLDER = "{count} older · in the list";
const EMPTY = "Empty column";

export function BoardColumn({ column, view, fold }: BoardColumnProps): ReactElement {
	return (
		<section className="wg-tasks-col" data-tasks-column={column.status}>
			<div className="wg-tasks-col-head">
				<StatusGlyph status={column.status} />
				<b>{column.label}</b>
				<span key={column.count} className="wg-tasks-t3 wg-tasks-count" data-tasks-count="">
					{column.count}
				</span>
				<span className="wg-tasks-fill" />
				{headEndOf(column, view, fold)}
			</div>
			{column.cards.map((card: Card) => (
				<TaskCard key={card.id} card={card} />
			))}
			{column.cards.length === 0 ? (
				<div className="wg-tasks-col-empty" data-tasks-col-empty="">
					{EMPTY}
				</div>
			) : null}
			{column.isClosed && column.hidden > 0 ? (
				<Button variant="ghost" size="s" data-tasks-older="" onClick={() => view.listOnly(column.status)}>
					{OLDER.replace("{count}", String(column.hidden))}
				</Button>
			) : null}
		</section>
	);
}

function headEndOf(column: Column, view: TasksView, fold: () => void): ReactNode {
	if (column.status === "ready_to_test") {
		return <span className="wg-tasks-t3">{YOUR_TURN}</span>;
	}

	if (column.status === "done") {
		return <ClosedMenu view={view} />;
	}

	return (
		<IconButton variant="ghost" size="xs" label={FOLD.replace("{status}", column.label)} onClick={fold}>
			<Icon name="chevrons-left" size={14} />
		</IconButton>
	);
}
