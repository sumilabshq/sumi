import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { Button } from "@widgetarium/kit";
import { useContinueTask } from "../../lib/use-continue-task.js";
import { ContinueLink } from "../task-card/continue-link.js";

export interface ContinueButtonProps {
	readonly card: TaskCard;
}

const CONTINUE = "Continue";

export function ContinueButton({ card }: ContinueButtonProps): ReactElement {
	const continueTask = useContinueTask(card);

	if (card.continueAt !== null) {
		return <ContinueLink card={card} />;
	}

	return (
		<Button variant="primary" size="s" isLoading={continueTask.isRunning} onClick={continueTask.run}>
			{CONTINUE}
		</Button>
	);
}
