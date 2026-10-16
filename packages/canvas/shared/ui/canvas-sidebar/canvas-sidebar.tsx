import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";

export interface CanvasSidebarProps {
	readonly top?: ReactNode;
	readonly bottom?: ReactNode;
}

const SIDEBAR =
	"cv:relative cv:flex cv:w-[260px] cv:cursor-default cv:flex-col cv:gap-3 cv:pt-[84px] cv:pr-2 cv:pb-4 cv:pl-2.5 cv:before:absolute cv:before:inset-0 cv:before:-z-[1] cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_right,black_70%,transparent)]";

export function CanvasSidebar({ top, bottom }: CanvasSidebarProps): ReactElement {
	return (
		<aside className={SIDEBAR} data-canvas-sidebar="" data-canvas-chrome="">
			<Slot loading={null}>{top}</Slot>
			<Slot loading={null}>{bottom}</Slot>
		</aside>
	);
}
