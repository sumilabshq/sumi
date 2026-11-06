import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot, useQuery } from "@widgetarium/data-framework";
import { SidebarQuery } from "@widgetarium/canvas";
import { SIDEBAR_LABEL } from "../../lib/sidebar-label.js";
import { SIDEBAR_HAIRLINE_PX } from "../../lib/sidebar-hairline.js";
import { SidebarEdge } from "../sidebar-edge/sidebar-edge.js";

export interface CanvasSidebarProps {
	readonly top?: ReactNode;
	readonly bottom?: ReactNode;
}

const SIDEBAR =
	"cv:box-border cv:flex cv:flex-none cv:cursor-default cv:flex-col cv:gap-0.5 cv:overflow-hidden cv:p-2 cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none";
const SHUT = "cv:invisible cv:absolute cv:inset-y-0 cv:left-0 cv:opacity-0";

export function CanvasSidebar({ top, bottom }: CanvasSidebarProps): ReactElement {
	const { isOpen, px, keptBesidePx } = useQuery(SidebarQuery).data;
	return (
		<>
			<aside
				className={isOpen ? SIDEBAR : `${SIDEBAR} ${SHUT}`}
				style={{ width: px, maxWidth: boardKeptOf(keptBesidePx) }}
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

// TRADE-OFF: repeats the resize cap, since a kept px ignores a narrower room
function boardKeptOf(keptBesidePx: number): string {
	return `calc(100% - ${keptBesidePx}px - ${SIDEBAR_HAIRLINE_PX}px)`;
}
