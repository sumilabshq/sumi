import { createElement as h, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { InboxClearingContext, NOTHING_CLEARED, UNDO_WINDOW_MS } from "../../lib/inbox-clearing-state.js";
import type { ClearingFacts, ClearingState } from "../../lib/inbox-clearing-state.js";

export interface InboxClearingScopeProps {
	readonly children: ReactNode;
}

export function InboxClearingScope({ children }: InboxClearingScopeProps): ReactElement {
	const [facts, setFacts] = useState<ClearingFacts>(NOTHING_CLEARED);

	useEffect(() => {
		if (facts.clearId === null) {
			return undefined;
		}

		const timer = setTimeout(() => setFacts(NOTHING_CLEARED), UNDO_WINDOW_MS);
		return () => clearTimeout(timer);
	}, [facts.clearId]);

	const state = useMemo<ClearingState>(
		() => ({
			...facts,
			offer: (clearId) => setFacts({ clearId, failure: null }),
			withdraw: () => setFacts(NOTHING_CLEARED),
			fail: (failure) => setFacts((was) => ({ ...was, failure })),
			retry: () => setFacts((was) => ({ ...was, failure: null })),
		}),
		[facts],
	);
	return <InboxClearingContext.Provider value={state}>{children}</InboxClearingContext.Provider>;
}
