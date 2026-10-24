import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { TOP_BAR_HEIGHT } from "../../lib/top-bar/top-bar-look.js";

export interface CanvasTopBarProps {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

const BAR = `${TOP_BAR_HEIGHT} cv:flex cv:flex-none cv:flex-row cv:items-center cv:justify-between cv:gap-1.5`;
const SIDE = "cv:flex cv:min-w-0 cv:items-center cv:gap-1.5";

export function CanvasTopBar({ start, end }: CanvasTopBarProps): ReactElement {
	return (
		<div className={BAR} data-canvas-topbar="">
			<div className={SIDE}>{start}</div>
			<div className={SIDE}>{end}</div>
		</div>
	);
}
