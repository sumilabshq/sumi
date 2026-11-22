import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ControlSpace } from "@widgetarium/kit";

export interface TopRowProps {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

export function TopRow({ start, end }: TopRowProps): ReactElement {
	return (
		<div className="sumi-canvas-top-row" data-canvas-top-row="">
			<ControlSpace side="start" surface="glass" className="sumi-canvas-plate">
				{start}
			</ControlSpace>
			<ControlSpace side="end" surface="glass" className="sumi-canvas-plate">
				{end}
			</ControlSpace>
		</div>
	);
}
