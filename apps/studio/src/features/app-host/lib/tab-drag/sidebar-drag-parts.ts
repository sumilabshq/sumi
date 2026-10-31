import { useState } from "react";
import { LayoutMotion } from "../layout-motion/layout-motion.js";
import { DragPreview } from "./drag-preview.js";
import { LaidOutSidebar } from "./laid-out-sidebar.js";

export interface SidebarDragParts {
	readonly preview: DragPreview;
	readonly motion: LayoutMotion;
	readonly laidOut: LaidOutSidebar;
}

export function useSidebarDragParts(): SidebarDragParts {
	const [parts] = useState(createSidebarDragParts);
	return parts;
}

function createSidebarDragParts(): SidebarDragParts {
	const motion = new LayoutMotion();
	return {
		preview: new DragPreview(),
		motion,
		laidOut: new LaidOutSidebar(motion),
	};
}
