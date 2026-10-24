import { createElement as h } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { FrameSide, SideLook } from "@widgetarium/layout";

export interface FrameSideColumnProps {
	readonly side: FrameSide;
	readonly look: SideLook;
	readonly panel: RefObject<HTMLDivElement | null>;
	readonly children: ReactNode;
}

export function FrameSideColumn({ side, look, panel, children }: FrameSideColumnProps): ReactElement {
	return (
		<div className={`wg-shell-${side}`} data-shell-column={side} data-state={look} inert={look === "hidden"}>
			<div ref={panel} className="wg-shell-side" data-shell-side={side}>
				{children}
			</div>
		</div>
	);
}
