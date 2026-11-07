import { useOptionalQuery } from "@widgetarium/data-framework";
import { TasksQuery } from "@widgetarium/tasks";
import type { TaskCard, TaskStatus } from "@widgetarium/tasks";

const WORKED_ON: TaskStatus[] = ["in_progress"];
const NO_CARDS: readonly TaskCard[] = [];
const NO_OWNER = "";

export function useChatTasks(chatId: string | undefined): readonly TaskCard[] {
	return (
		useOptionalQuery(TasksQuery, {
			owner: chatId ?? NO_OWNER,
			status: WORKED_ON,
		}).data?.items ?? NO_CARDS
	);
}
