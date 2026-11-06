import { useCallback, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/framework";
import { ShowTabCommand, ShownSplitQuery } from "@widgetarium/app-host";
import type { ShownSplit } from "@widgetarium/app-host";
import type { PaneBoard } from "@widgetarium/layout";
import { viewTargetOf } from "./split-panes.js";

interface Seen {
	readonly split: ShownSplit["split"];
	readonly tree: PaneBoard;
	readonly showTab: (ask: { readonly id: string }) => Promise<{ readonly ok: boolean }>;
}

interface Asked {
	current: string | null;
}

export function useFocusesSplitMember(tree: PaneBoard): (paneId: string) => void {
	const showTab = useCommand(ShowTabCommand);
	const looked: Seen = {
		split: useQuery(ShownSplitQuery).data.split,
		tree,
		showTab: showTab.run,
	};
	const seen = useRef(looked);
	const asked = useRef<string | null>(null);
	seen.current = looked;
	return useCallback((paneId: string) => focusOnce(seen.current, asked, paneId), []);
}

function focusOnce(seen: Seen, asked: Asked, paneId: string): void {
	const memberId = unfocusedMemberOf(seen, paneId);

	if (memberId === null || memberId === asked.current) {
		return;
	}

	asked.current = memberId;
	void seen.showTab({ id: memberId }).finally(() => {
		asked.current = null;
	});
}

function unfocusedMemberOf({ split, tree }: Seen, paneId: string): string | null {
	const memberId = viewTargetOf(paneId, tree.leaves, tree.chatGroups)?.tabId ?? null;

	if (split === null || memberId === null || memberId === split.focusedId) {
		return null;
	}

	return split.memberIds.includes(memberId) ? memberId : null;
}
