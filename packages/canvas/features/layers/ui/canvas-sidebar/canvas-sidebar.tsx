import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot, useQuery } from "@widgetarium/core/requests";
import { SidebarQuery } from "../../contract.js";
import { SIDEBAR_LABEL } from "../../lib/sidebar-label.js";
import { SIDEBAR_BOUNDS } from "../../../../shared/lib/view/sidebar-width.js";
import { SidebarEdge } from "../sidebar-edge/sidebar-edge.js";

export interface CanvasSidebarProps {
	readonly top?: ReactNode;
	readonly bottom?: ReactNode;
}

const SIDEBAR =
	"cv:box-border cv:flex cv:flex-none cv:cursor-default cv:flex-col cv:gap-0.5 cv:overflow-hidden cv:rounded-plate cv:bg-raise cv:p-2 cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none";
// TRADE-OFF: repeats the resize cap, since a kept px ignores a narrower room
const BOARD_KEPT = `calc(100% - ${SIDEBAR_BOUNDS.keptBesidePx}px - var(--wg-kit-plate-pad, 6px))`;
const SHUT = "cv:invisible cv:absolute cv:inset-y-0 cv:left-0 cv:opacity-0";

export function CanvasSidebar({ top, bottom }: CanvasSidebarProps): ReactElement {
	const { isOpen, px } = useQuery(SidebarQuery).data;
	return (
		<>
			<aside
				className={isOpen ? SIDEBAR : `${SIDEBAR} ${SHUT}`}
				style={{ width: px, maxWidth: BOARD_KEPT }}
				aria-label={SIDEBAR_LABEL}
				aria-hidden={!isOpen}
				data-canvas-sidebar={isOpen ? "open" : "shut"}
				data-canvas-chrome=""
			>
				<Slot loading={null}>{top}</Slot>
				<Slot loading={null}>{bottom}</Slot>
			</aside>
			<SidebarEdge />
		</>
	);
}
