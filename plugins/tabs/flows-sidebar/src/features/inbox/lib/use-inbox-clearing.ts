import { useCommand } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { useInboxClearingState } from "./inbox-clearing-state.js";

const UNDO_FAILED = "Could not undo";

export interface InboxClearing {
	readonly canUndo: boolean;
	readonly failure: string | null;
	clear(): void;
	undo(): void;
}

export function useInboxClearing(): InboxClearing {
	const clearInbox = useCommand(navigation.inbox.clear);
	const undoClear = useCommand(navigation.inbox.undoClear);
	const state = useInboxClearingState();
	return {
		canUndo: state.clearId !== null,
		failure: state.failure,
		clear: () => {
			if (clearInbox.isRunning || state.clearId !== null) {
				return;
			}

			void clearInbox.run().then((answer) => {
				if (answer.ok && answer.output.clearedTabIds.length > 0) {
					state.offer(answer.output.clearId);
				}
			});
		},
		undo: () => {
			if (state.clearId === null || undoClear.isRunning) {
				return;
			}

			state.retry();
			void undoClear.run({ clearId: state.clearId }).then((answer) => {
				if (answer.ok) {
					state.withdraw();
					return;
				}

				console.error(`[widgetarium] inbox undo refused: ${answer.reason}`);
				state.fail(UNDO_FAILED);
			});
		},
	};
}
