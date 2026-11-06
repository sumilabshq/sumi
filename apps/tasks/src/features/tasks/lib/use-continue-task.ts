import { ContinueTaskCommand } from "@widgetarium/tasks";
import type { TaskCard } from "@widgetarium/tasks";
import { useCommand } from "@widgetarium/data-framework";
import { useHandsOnTask } from "./use-hands-on-task.js";

export interface ContinueTask {
	readonly isRunning: boolean;
	readonly run: () => void;
}

export function useContinueTask(card: TaskCard): ContinueTask {
	const continueTask = useCommand(ContinueTaskCommand);
	const handOn = useHandsOnTask(card);
	return {
		isRunning: continueTask.isRunning,
		run: () =>
			void handOn((chat) =>
				continueTask.run({
					task: card.id,
					chat,
				}),
			),
	};
}
