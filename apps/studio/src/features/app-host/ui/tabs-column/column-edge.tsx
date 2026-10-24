import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ColumnSide } from "@widgetarium/app-host";
import { useColumnEdge } from "../../lib/use-column-edge.js";

export interface ColumnEdgeProps {
	readonly side: ColumnSide;
	readonly widthPx: number;
}

const EDGE =
	"wg-studio-edge-line cv:absolute cv:inset-y-0 cv:z-[2] cv:w-[var(--wg-studio-edge,6px)] cv:cursor-col-resize cv:touch-none cv:outline-none";
const AT: Readonly<Record<ColumnSide, string>> = {
	end: `${EDGE} cv:left-0 cv:-translate-x-full`,
	start: `${EDGE} cv:right-0 cv:translate-x-full`,
};
const TABS_WIDTH = "Tabs width";

export function ColumnEdge({ side, widthPx }: ColumnEdgeProps): ReactElement {
	const handlers = useColumnEdge(side, widthPx);
	return (
		<div
			role="separator"
			tabIndex={0}
			aria-label={TABS_WIDTH}
			aria-orientation="vertical"
			aria-valuenow={widthPx}
			className={AT[side]}
			data-host-column-edge=""
			{...handlers}
		/>
	);
}
