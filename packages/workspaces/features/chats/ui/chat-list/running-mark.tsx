import { createElement as h } from "react";
import type { ReactElement } from "react";

const RUNNING = "Working";
const SPOKES: readonly number[] = [0, 45, 90, 135, 180, 225, 270, 315];
const FIRST_SPOKE_OPACITY = 0.2;
const SPOKE_OPACITY_STEP = 0.1;

export function RunningMark(): ReactElement {
	return (
		<span className="wg-ws-mark">
			<svg className="wg-ws-spin" viewBox="0 0 24 24" role="img" aria-label={RUNNING}>
				{SPOKES.map((angle, at) => (
					<line
						key={angle}
						x1="12"
						y1="3"
						x2="12"
						y2="7"
						transform={`rotate(${angle} 12 12)`}
						opacity={FIRST_SPOKE_OPACITY + SPOKE_OPACITY_STEP * at}
					/>
				))}
			</svg>
		</span>
	);
}
