import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BoardColumn } from "@widgetarium/tasks";
import type { OpenTask } from "../../lib/use-open-task.js";
import { TaskCard } from "../task-card/task-card.js";

export interface WaitingFirstProps {
	readonly columns: readonly BoardColumn[];
	readonly openTask: OpenTask;
}

const WAITS_FOR_YOU = "Waits for you";

export function WaitingFirst({ columns, openTask }: WaitingFirstProps): ReactElement | null {
	const yours = columns.flatMap((column) => column.cards.filter((card) => card.isYourTurn));

	if (yours.length === 0) {
		return null;
	}

	return (
		<section className="wg-tasks-waiting" data-tasks-waiting="">
			<div className="wg-tasks-col-head">
				<b>{WAITS_FOR_YOU}</b>
				<span className="wg-tasks-t3">{yours.length}</span>
			</div>
			{yours.map((card) => (
				<TaskCard key={card.id} card={card} openTask={openTask} />
			))}
		</section>
	);
}
