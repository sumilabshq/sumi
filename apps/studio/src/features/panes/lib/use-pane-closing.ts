import { useCallback } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { CloseViewPaneCommand } from "@widgetarium/app-host";
import type { PaneLeaf } from "@widgetarium/layout";
import { carriedTabOf } from "./split-panes.js";

export function usePaneClosing(leaf: PaneLeaf): () => void {
	const closeViewPane = useCommand(CloseViewPaneCommand);
	const tabId = carriedTabOf(leaf.view);
	return useCallback(() => void closeViewPane.run({ paneId: leaf.id, tabId }), [closeViewPane, leaf.id, tabId]);
}
