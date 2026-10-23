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
	readonly isInPlate?: boolean;
}

const VIEW = "cv:flex cv:h-full cv:w-full cv:flex-col cv:overflow-hidden";
const VIEW_FRAMED = `${VIEW} cv:gap-[var(--wg-kit-plate-pad,6px)] cv:bg-group cv:p-[var(--wg-kit-plate-pad,6px)]`;
const PLATE = "cv:relative cv:flex cv:min-h-0 cv:flex-1 cv:overflow-hidden";
const PLATE_FRAMED = `${PLATE} cv:rounded-plate cv:bg-raise`;
const BOARD = "cv:relative cv:min-w-0 cv:flex-1 cv:overflow-hidden";

export function CanvasLayout({
	header,
	start,
	end,
	bottom,
	children,
	isInPlate = false,
}: CanvasLayoutProps): ReactElement {
	return (
		<div className={isInPlate ? VIEW : VIEW_FRAMED} data-canvas-view="">
			<Slot loading={null}>{header}</Slot>
			<div className={isInPlate ? PLATE : PLATE_FRAMED} data-canvas-plate="">
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
