import { useState } from "react";
import { LayoutMotion } from "../layout-motion/layout-motion.js";
import { DragPreview } from "./drag-preview.js";
import { LaidOutSidebar } from "./laid-out-sidebar.js";
import { PendingMoves } from "./pending-moves.js";

export interface SidebarDragParts {
	readonly preview: DragPreview;
	readonly motion: LayoutMotion;
	readonly laidOut: LaidOutSidebar;
	readonly pending: PendingMoves;
}

export function useSidebarDragParts(): SidebarDragParts {
	const [parts] = useState(createSidebarDragParts);
	return parts;
}

function createSidebarDragParts(): SidebarDragParts {
	const motion = new LayoutMotion();
	const preview = new DragPreview();
	const pending = new PendingMoves();
	pending.setRenameListener(preview.renameItem);
	return {
		preview,
		motion,
		laidOut: new LaidOutSidebar(motion),
		pending,
	};
}
