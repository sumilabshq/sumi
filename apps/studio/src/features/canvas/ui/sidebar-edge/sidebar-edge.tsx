import { createElement as h, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/framework";
import { ResetSidebarWidthCommand, ResizeSidebarWidthCommand, SidebarQuery } from "@widgetarium/canvas";
import { SIDEBAR_HAIRLINE_PX } from "../../lib/sidebar-hairline.js";

const EDGE_LABEL = "Sidebar width";
const EDGE =
	"wg-studio-edge-line cv:relative cv:z-[2] cv:-mx-[calc((var(--wg-studio-edge,6px)_-_1px)_/_2)] cv:w-[var(--wg-studio-edge,6px)] cv:flex-none cv:cursor-col-resize cv:touch-none cv:outline-none cv:before:absolute cv:before:inset-y-0 cv:before:left-[calc((var(--wg-studio-edge,6px)_-_1px)_/_2)] cv:before:w-px cv:before:bg-line cv:before:content-['']";

export function SidebarEdge(): ReactElement | null {
	const edge = useRef<HTMLDivElement | null>(null);
	const { isOpen, px, leastPx } = useQuery(SidebarQuery).data;
	const handlers = useSidebarEdgeResize(edge, px);
	if (!isOpen) {
		return null;
	}

	return (
		<div
			ref={edge}
			className={EDGE}
			role="separator"
			tabIndex={0}
			aria-label={EDGE_LABEL}
			aria-orientation="vertical"
			aria-valuemin={leastPx}
			aria-valuenow={px}
			data-canvas-sidebar-edge=""
			{...handlers}
		/>
	);
}

function useSidebarEdgeResize(edge: RefObject<HTMLDivElement | null>, px: number): EdgeResizeHandlers {
	const resize = useCommand(ResizeSidebarWidthCommand);
	const reset = useCommand(ResetSidebarWidthCommand);
	return useEdgeResize({
		widthOf: () => px,
		onResize: (asked) => void resize.run({ px: asked, roomPx: roomBesideOf(edge.current) }),
		onReset: () => void reset.run(),
	});
}

function roomBesideOf(edge: HTMLElement | null): number {
	const plate = edge?.parentElement;
	if (!plate) {
		return 0;
	}

	return plate.clientWidth - SIDEBAR_HAIRLINE_PX;
}
