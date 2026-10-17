import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot, useQuery } from "@widgetarium/core/requests";
import { SidebarQuery } from "../../contract.js";

export interface CanvasSidebarProps {
	readonly top?: ReactNode;
	readonly bottom?: ReactNode;
}

const SIDEBAR =
	"cv:relative cv:flex cv:w-[260px] cv:cursor-default cv:flex-col cv:gap-3 cv:pt-[84px] cv:pr-2 cv:pb-4 cv:pl-2.5 cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none cv:before:absolute cv:before:inset-0 cv:before:-z-[1] cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_right,black_70%,transparent)]";
const SHUT = "cv:invisible cv:opacity-0";

export function CanvasSidebar({ top, bottom }: CanvasSidebarProps): ReactElement {
	const { isOpen } = useQuery(SidebarQuery).data;
	return (
		<aside
			className={isOpen ? SIDEBAR : `${SIDEBAR} ${SHUT}`}
			aria-hidden={!isOpen}
			data-canvas-sidebar={isOpen ? "open" : "shut"}
			data-canvas-chrome=""
		>
			<Slot loading={null}>{top}</Slot>
			<Slot loading={null}>{bottom}</Slot>
		</aside>
	);
}
