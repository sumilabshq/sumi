import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { Placed } from "./placed.js";

export interface CanvasLayoutProps {
	readonly header?: ReactNode;
	readonly start?: ReactNode;
	readonly end?: ReactNode;
	readonly bottom?: ReactNode;
	readonly children?: ReactNode;
}

const VIEW =
	"cv:flex cv:h-full cv:w-full cv:flex-col cv:gap-[var(--wg-kit-plate-pad,6px)] cv:overflow-hidden cv:bg-group cv:p-[var(--wg-kit-plate-pad,6px)]";
const BODY = "cv:relative cv:flex cv:min-h-0 cv:flex-1 cv:gap-[var(--wg-kit-plate-pad,6px)]";
const BOARD = "cv:relative cv:min-w-0 cv:flex-1 cv:overflow-hidden cv:rounded-plate";

export function CanvasLayout({ header, start, end, bottom, children }: CanvasLayoutProps): ReactElement {
	return (
		<div className={VIEW} data-canvas-view="">
			<Slot loading={null}>{header}</Slot>
			<div className={BODY}>
				<Slot loading={null}>{start}</Slot>
				<div className={BOARD} data-canvas-board="">
					<Slot>{children}</Slot>
					<Placed at="cv:inset-y-0 cv:right-0 cv:z-[1]">{end}</Placed>
					<Placed at="cv:bottom-4 cv:left-1/2 cv:z-[2] cv:-translate-x-1/2">{bottom}</Placed>
				</div>
			</div>
		</div>
	);
}
