import { useEffect, useState } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";

export const UNDO_WINDOW_MS = 6000;

export interface InboxClearing {
	readonly canUndo: boolean;
	clear(): void;
	undo(): void;
}

export function useInboxClearing(): InboxClearing {
	const clearInbox = useCommand(navigation.inbox.clear);
	const undoClear = useCommand(navigation.inbox.undoClear);
	const [clearId, setClearId] = useState<string | null>(null);

	useEffect(() => {
		if (clearId === null) {
			return undefined;
		}

		const timer = setTimeout(() => setClearId(null), UNDO_WINDOW_MS);
		return () => clearTimeout(timer);
	}, [clearId]);

	return {
		canUndo: clearId !== null,
		clear: () =>
			void clearInbox.run().then((answer) => {
				if (answer.ok && answer.output.clearedTabIds.length > 0) {
					setClearId(answer.output.clearId);
				}
			}),
		undo: () => {
			if (clearId !== null) {
				void undoClear.run({ clearId });
				setClearId(null);
			}
		},
	};
}
