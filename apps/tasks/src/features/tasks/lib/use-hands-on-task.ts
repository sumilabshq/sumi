import type { Continued, TaskCard } from "@widgetarium/tasks";
import type { CommandAnswer } from "@widgetarium/core/gateway/run-handler.js";
import { useListedChat } from "./chat-delivery.js";
import { useDeliverTask } from "./use-deliver-task.js";

export type RunForChat = (chat: string | null) => Promise<CommandAnswer<Continued>>;

export type HandOnTask = (runForChat: RunForChat) => Promise<boolean>;

export function useHandsOnTask(card: TaskCard): HandOnTask {
	const listedChat = useListedChat();
	const deliver = useDeliverTask(card.id);
	return async (runForChat) => {
		const answer = await runForChat(await listedChat(card.owner));

		if (!answer.ok) {
			return false;
		}

		void deliver(answer.output);
		return true;
	};
}
