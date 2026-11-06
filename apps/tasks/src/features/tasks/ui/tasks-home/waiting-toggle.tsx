import { createElement as h } from "react";
import type { ReactElement } from "react";
import { BoardQuery } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/framework";
import { Count, Icon, Toggle } from "@widgetarium/kit";
import type { TasksView } from "../../lib/use-tasks-view.js";

export interface WaitingToggleProps {
	readonly view: TasksView;
}

const WAITING = "Waiting for you";

export function WaitingToggle({ view }: WaitingToggleProps): ReactElement | null {
	const { waitingForYou } = useQuery(BoardQuery, view.ask).data;

	if (waitingForYou === 0 && !view.ask.isYourTurnOnly) {
		return null;
	}

	return (
		<Toggle
			size="sm"
			pressed={view.ask.isYourTurnOnly}
			onPressedChange={(isYourTurnOnly) => view.askBoard({ isYourTurnOnly })}
			data-tasks-waiting-toggle=""
		>
			<Icon name="user-round" size={14} />
			<span className="wg-tasks-yours-said">{WAITING}</span>
			<Count key={waitingForYou} data-tasks-waiting-count="">
				{waitingForYou}
			</Count>
		</Toggle>
	);
}
