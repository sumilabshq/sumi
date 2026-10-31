import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { Button } from "@widgetarium/kit";
import { useContinueTask } from "../../lib/use-continue-task.js";
import { ContinueLater } from "./continue-later.js";

export interface ContinueLinkProps {
	readonly card: TaskCard;
}

const CONTINUE = "Continue →";

export function ContinueLink({ card }: ContinueLinkProps): ReactElement {
	const continueTask = useContinueTask(card);

	if (card.continueAt !== null) {
		return <ContinueLater continueAt={card.continueAt} />;
	}

	return (
		<Button
			variant="link"
			size="s"
			className="wg-tasks-resolve"
			data-tasks-continue="now"
			isLoading={continueTask.isRunning}
			onClick={(event) => {
				event.stopPropagation();
				continueTask.run();
			}}
		>
			{CONTINUE}
		</Button>
	);
}
