import { useMemo, useSyncExternalStore } from "react";
import type { TabsSidebar } from "@widgetarium/app-host";
import { arrangedSidebar } from "../tab-drag/arranged-sidebar.js";
import type { DragPreviewState } from "../tab-drag/drag-preview.js";
import { useLiftedLook } from "../tab-drag/lifted-look.js";
import type { LiftedLook } from "../tab-drag/lifted-look.js";
import type { SidebarDragParts } from "../tab-drag/sidebar-drag-parts.js";

export interface ArrangedSidebar {
	readonly preview: DragPreviewState | null;
	readonly shown: TabsSidebar;
	readonly lifted: LiftedLook;
}

export function useArrangedSidebar(drag: SidebarDragParts, sidebar: TabsSidebar): ArrangedSidebar {
	const preview = useSyncExternalStore(drag.preview.subscribe, drag.preview.now);
	const shown = useMemo(() => (preview === null ? sidebar : arrangedSidebar(sidebar, preview)), [sidebar, preview]);
	return {
		preview,
		shown,
		lifted: useLiftedLook(preview, sidebar),
	};
}
