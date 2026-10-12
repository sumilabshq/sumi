import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/mediator";
import { Corner } from "./corner.js";

export interface CanvasTopBarProps {
	readonly cornersStart?: ReactNode;
	readonly start?: ReactNode;
	readonly end?: ReactNode;
	readonly cornersEnd?: ReactNode;
}

const BAR =
	"cv:pointer-events-none cv:absolute cv:inset-x-0 cv:top-0 cv:z-[2] cv:flex cv:flex-row cv:items-center cv:justify-between cv:gap-4 cv:pb-10 cv:before:absolute cv:before:inset-0 cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_bottom,black_45%,transparent)] cv:*:pointer-events-auto cv:*:relative";

export function CanvasTopBar({ cornersStart, start, end, cornersEnd }: CanvasTopBarProps): ReactElement {
	const hasCorners = Boolean(cornersStart) || Boolean(cornersEnd);
	return (
		<div className={hasCorners ? BAR : `${BAR} cv:px-4 cv:pt-4`} data-canvas-topbar="">
			<div className="cv:flex cv:min-w-0 cv:items-center cv:gap-2">
				<Corner>{cornersStart}</Corner>
				<div className="cv:relative cv:flex cv:items-center cv:gap-2 cv:py-1.5 cv:text-base">
					<Slot loading={null}>{start}</Slot>
				</div>
			</div>
			<div className="cv:flex cv:items-center cv:gap-2">
				<Slot loading={null}>{end}</Slot>
				<Corner>{cornersEnd}</Corner>
			</div>
		</div>
	);
}
