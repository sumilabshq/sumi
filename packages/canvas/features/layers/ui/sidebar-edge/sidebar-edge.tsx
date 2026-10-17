import { createElement as h, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ResetSidebarWidthCommand, ResizeSidebarWidthCommand, SidebarQuery } from "../../contract.js";
import { SIDEBAR_BOUNDS } from "../../../../shared/lib/view/sidebar-width.js";

const EDGE_LABEL = "Sidebar width";
const EDGE =
	"cv:relative cv:-mx-[var(--wg-kit-plate-pad,6px)] cv:w-[var(--wg-kit-plate-pad,6px)] cv:flex-none cv:cursor-col-resize cv:touch-none cv:outline-none cv:after:absolute cv:after:inset-y-4 cv:after:left-1/2 cv:after:w-0.5 cv:after:-translate-x-1/2 cv:after:rounded-full cv:after:transition-colors cv:after:content-[''] cv:hover:after:bg-brand cv:active:after:bg-brand cv:focus-visible:after:bg-brand";

export function SidebarEdge(): ReactElement | null {
	const edge = useRef<HTMLDivElement | null>(null);
	const { isOpen, px } = useQuery(SidebarQuery).data;
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
			aria-valuemin={SIDEBAR_BOUNDS.leastPx}
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
	const row = edge?.parentElement;
	if (!row) {
		return 0;
	}

	return row.clientWidth - (parseFloat(getComputedStyle(row).columnGap) || 0);
}
