import type { TaskCard } from "@widgetarium/tasks";

export function workingChatOf(card: TaskCard): string | null {
	return card.status === "in_progress" ? card.owner : null;
}
