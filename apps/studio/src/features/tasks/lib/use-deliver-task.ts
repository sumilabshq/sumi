import { UndeliveredTaskCommand } from "@widgetarium/tasks";
import type { Continued, TaskCard } from "@widgetarium/tasks";
import { useCommand } from "@widgetarium/core/requests";
import { toast } from "@widgetarium/kit";
import { useSendToChat } from "../../../assistant/chat-delivery-context.js";

export type DeliverTask = (continued: Continued) => Promise<void>;

const NOT_DELIVERED = "{task} is paused: its chat did not get the message ({reason})";
const NOT_DELIVERED_KEPT = "{task} stays in {status}: its chat did not get the message ({reason})";
const NOT_DELIVERED_UNCHANGED = "{task} was not delivered ({reason}) and is left as it was: {refusal}";

export function useDeliverTask(task: string): DeliverTask {
	const sendToChat = useSendToChat();
	const undelivered = useCommand(UndeliveredTaskCommand);
	return async (continued) => {
		const delivered = await sendToChat(continued);

		if (delivered.ok) {
			return;
		}

		const left = await undelivered.run({
			task,
			reason: delivered.reason,
		});
		const said = undeliveredWordsOf({ task, reason: delivered.reason, left });
		console.error(`[widgetarium] ${said}`);
		toast.error(said);
	};
}

type UndeliveredLeft =
	| {
			readonly ok: true;
			readonly output: TaskCard;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

interface Undelivered {
	readonly task: string;
	readonly reason: string;
	readonly left: UndeliveredLeft;
}

export function undeliveredWordsOf({ task, reason, left }: Undelivered): string {
	if (!left.ok) {
		return NOT_DELIVERED_UNCHANGED.replace("{task}", task)
			.replace("{reason}", reason)
			.replace("{refusal}", left.reason);
	}

	const words =
		left.output.status === "paused" ? NOT_DELIVERED : NOT_DELIVERED_KEPT.replace("{status}", left.output.statusLabel);
	return words.replace("{task}", task).replace("{reason}", reason);
}
