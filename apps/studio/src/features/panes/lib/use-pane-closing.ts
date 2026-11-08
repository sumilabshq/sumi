import { useCallback } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { PaneLeaf } from "@widgetarium/layout/contract";
import { carriedTabOf } from "./split-panes.js";

export function usePaneClosing(leaf: PaneLeaf): () => void {
	const closeViewPane = useCommand(appHost.splits.closeViewPane);
	const tabId = carriedTabOf(leaf.view);
	return useCallback(() => void closeViewPane.run({ paneId: leaf.id, tabId }), [closeViewPane, leaf.id, tabId]);
}
