import { useOptionalQuery } from "@widgetarium/data-framework";
import { tasks } from "@widgetarium/tasks/contract";
import type { TaskCard, TaskStatus } from "@widgetarium/tasks/contract";

const WORKED_ON: TaskStatus[] = ["in_progress"];
const NO_CARDS: readonly TaskCard[] = [];

export function useChatTasks(chatId: string): readonly TaskCard[] {
	return (
		useOptionalQuery(tasks.board.all, {
			owner: chatId,
			status: WORKED_ON,
		}).data?.items ?? NO_CARDS
	);
}
