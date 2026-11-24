import { createContext, useContext } from "react";

export const UNDO_WINDOW_MS = 6000;

export interface ClearingFacts {
	readonly clearId: string | null;
	readonly failure: string | null;
}

export interface ClearingState extends ClearingFacts {
	offer(clearId: string): void;
	withdraw(): void;
	fail(message: string): void;
	retry(): void;
}

export const NOTHING_CLEARED: ClearingFacts = { clearId: null, failure: null };

export const InboxClearingContext = createContext<ClearingState | null>(null);

const OUTSIDE_SCOPE = "the Inbox was drawn outside an InboxClearingScope";

export function useInboxClearingState(): ClearingState {
	const state = useContext(InboxClearingContext);

	if (state === null) {
		throw new Error(OUTSIDE_SCOPE);
	}

	return state;
}
