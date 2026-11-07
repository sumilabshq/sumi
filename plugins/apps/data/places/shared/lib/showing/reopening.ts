import { reopenClosed } from "../tabs/tab-closing.js";
import { WORKSPACE_LIST } from "../tabs/tab-lists.js";
import { withMoved } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";
import { withOpenedTabShown } from "./opening.js";

export function withClosedReopened(showing: Showing, facts: TabFacts, tabId: string): Showing | null {
	const reopened = reopenClosed(showing.moment, facts.focusedChatId ?? WORKSPACE_LIST, tabId);

	if (reopened === null) {
		return null;
	}

	return withOpenedTabShown(withMoved(showing, reopened), facts, reopened.closed.tab, reopened.closed.address);
}
