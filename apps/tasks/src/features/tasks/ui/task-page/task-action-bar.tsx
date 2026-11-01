import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { AcceptTaskCommand } from "@widgetarium/tasks";
import type { TaskCard } from "@widgetarium/tasks";
import { useCommand } from "@widgetarium/core/requests";
import { Button } from "@widgetarium/kit";
import { SendBackFold } from "./send-back-fold.js";

export interface TaskActionBarProps {
	readonly card: TaskCard;
}

export function hasActionBar(card: TaskCard): boolean {
	return card.isYourTurn && card.actions.includes("accept") && card.actions.includes("send_back");
}

export function TaskActionBar({ card }: TaskActionBarProps): ReactElement {
	const accept = useCommand(AcceptTaskCommand).with({ task: card.id });
	const [isSendingBack, setSendingBack] = useState(false);
	return (
		<div className="wg-tasks-action-bar" data-tasks-action-bar="">
			<SendBackFold card={card} isOpen={isSendingBack} close={() => setSendingBack(false)} />
			{isSendingBack ? null : (
				<div className="wg-tasks-action-bar-acts">
					<Button variant="secondary" size="m" block data-tasks-send-back-open="" onClick={() => setSendingBack(true)}>
						Send back
					</Button>
					<Button variant="primary" size="m" block data-tasks-accept="" onClick={() => void accept.run()}>
						Accept
					</Button>
				</div>
			)}
		</div>
	);
}
