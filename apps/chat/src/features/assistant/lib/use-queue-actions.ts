import { useCommand } from "@widgetarium/core/requests";
import { ChangeQueueCommand, SendMessageCommand } from "@widgetarium/assistant";
import { answerSettled } from "./answer-settled.js";
import type { Report } from "./failure-line.js";

export interface QueueActions {
	remove(id: string): void;
	hold(id: string, isHeld: boolean): Promise<boolean>;
	sendNow(): void;
	saveEdit(id: string, said: string): Promise<boolean>;
}

const NOT_REMOVED = "the queued message was not removed";
const NOT_HELD = "the queued message could not be opened for editing";
const NOT_SENT = "the queue was not sent";
const NOT_SAVED = "the edited message was not saved";

export function useQueueActions(report: Report): QueueActions {
	const change = useCommand(ChangeQueueCommand);
	const sendMessage = useCommand(SendMessageCommand);
	return {
		remove: (id) =>
			void report(
				answerSettled(
					change.run({
						kind: "remove",
						id,
					}),
				),
				NOT_REMOVED,
			),
		hold: (id, isHeld) =>
			report(
				answerSettled(
					change.run({
						kind: "hold",
						id,
						isHeld,
					}),
				),
				NOT_HELD,
			),
		sendNow: () => void report(answerSettled(change.run({ kind: "send-now" })), NOT_SENT),
		saveEdit: (id, said) =>
			report(
				answerSettled(
					sendMessage.run({
						said,
						replaces: id,
					}),
				),
				NOT_SAVED,
			),
	};
}
