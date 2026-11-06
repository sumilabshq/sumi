import { Fragment, createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { TasksQuery } from "@widgetarium/tasks";
import type { TaskCard, TaskStatus } from "@widgetarium/tasks";
import { Fold } from "../fold/fold.js";
import { TaskRow } from "./task-row.js";
import { TasksToggle } from "./tasks-toggle.js";

export interface LiveWithTasksProps {
	readonly chatId: string;
	readonly step: ReactNode;
}

const WORKED_ON: TaskStatus[] = ["in_progress"];
const NO_CARDS: readonly TaskCard[] = [];

export function LiveWithTasks({ chatId, step }: LiveWithTasksProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const cards =
		useOptionalQuery(TasksQuery, {
			owner: chatId,
			status: WORKED_ON,
		}).data?.items ?? NO_CARDS;
	return (
		<Fragment>
			<div className="wg-studio-ai-live-head">
				{step}
				{cards.length === 0 ? null : (
					<TasksToggle count={cards.length} isOpen={isOpen} onToggle={() => setOpen(!isOpen)} />
				)}
			</div>
			<Fold isOpen={isOpen && cards.length > 0}>
				<div className="wg-studio-ai-live-tasks">
					{cards.map((card) => (
						<TaskRow key={card.id} card={card} />
					))}
				</div>
			</Fold>
		</Fragment>
	);
}
