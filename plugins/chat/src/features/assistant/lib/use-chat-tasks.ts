import { useOptionalQuery } from "@widgetarium/data-framework";
import { tasks } from "@widgetarium/tasks/contract";
import type { TaskCard, TaskStatus } from "@widgetarium/tasks/contract";

const WORKED_ON: TaskStatus[] = ["in_progress"];
const NO_CARDS: readonly TaskCard[] = [];
const NO_OWNER = "";

export function useChatTasks(chatId: string | undefined): readonly TaskCard[] {
	return (
		useOptionalQuery(tasks.board.all, {
			owner: chatId ?? NO_OWNER,
			status: WORKED_ON,
		}).data?.items ?? NO_CARDS
	);
}
