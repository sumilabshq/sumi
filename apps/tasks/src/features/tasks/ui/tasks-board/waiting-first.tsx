import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BoardColumn } from "@widgetarium/tasks";
import { TaskCard } from "../task-card/task-card.js";

export interface WaitingFirstProps {
	readonly columns: readonly BoardColumn[];
}

const WAITS_FOR_YOU = "Waits for you";

export function WaitingFirst({ columns }: WaitingFirstProps): ReactElement | null {
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
				<TaskCard key={card.id} card={card} />
			))}
		</section>
	);
}
