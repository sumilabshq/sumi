import { useEffect } from "react";
import type { TabsSidebar } from "@widgetarium/app-host/contract";
import type { SidebarDragParts } from "../tab-drag/sidebar-drag-parts.js";

export function useFeedsPendingMoves(drag: SidebarDragParts, sidebar: TabsSidebar): void {
	useEffect(() => drag.pending.hearSidebar(sidebar), [drag, sidebar]);
	useEffect(() => () => drag.pending.dispose(), [drag]);
}
