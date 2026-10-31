import { useEffect } from "react";
import type { TabsSidebar } from "@widgetarium/app-host";
import type { SidebarDragParts } from "../tab-drag/sidebar-drag-parts.js";

export function usePreviewHearsSidebar(drag: SidebarDragParts, sidebar: TabsSidebar): void {
	useEffect(() => drag.preview.heard(sidebar), [drag, sidebar]);
}
