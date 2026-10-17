import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { Corner } from "./corner.js";
import { TOP_BAR_HEIGHT } from "../../lib/top-bar/top-bar-look.js";

export interface CanvasTopBarProps {
	readonly cornersStart?: ReactNode;
	readonly start?: ReactNode;
	readonly end?: ReactNode;
	readonly cornersEnd?: ReactNode;
}

const BAR = `${TOP_BAR_HEIGHT} cv:flex cv:flex-none cv:flex-row cv:items-center cv:justify-between cv:gap-1.5`;
const SIDE = "cv:flex cv:min-w-0 cv:items-center cv:gap-1.5";
const START_SIDE_OFF_EDGE = `${SIDE} cv:ps-1.5`;

export function CanvasTopBar({ cornersStart, start, end, cornersEnd }: CanvasTopBarProps): ReactElement {
	const isStartOnCardEdge = !cornersStart && Boolean(cornersEnd);
	return (
		<div className={BAR} data-canvas-topbar="">
			<div className={isStartOnCardEdge ? START_SIDE_OFF_EDGE : SIDE}>
				<Corner>{cornersStart}</Corner>
				<Slot loading={null}>{start}</Slot>
			</div>
			<div className={SIDE}>
				<Slot loading={null}>{end}</Slot>
				<Corner>{cornersEnd}</Corner>
			</div>
		</div>
	);
}
