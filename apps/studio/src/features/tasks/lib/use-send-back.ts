import { SendBackTaskCommand } from "@widgetarium/tasks";
import type { TaskCard } from "@widgetarium/tasks";
import { useCommand } from "@widgetarium/core/requests";
import { useHandsOnTask } from "./use-hands-on-task.js";

export interface SendBack {
	readonly isRunning: boolean;
	readonly run: (note: string) => Promise<boolean>;
}

export function useSendBack(card: TaskCard): SendBack {
	const sendBack = useCommand(SendBackTaskCommand);
	const handOn = useHandsOnTask(card);
	return {
		isRunning: sendBack.isRunning,
		run: (note) =>
			handOn((chat) =>
				sendBack.run({
					task: card.id,
					note,
					chat,
				}),
			),
	};
}
