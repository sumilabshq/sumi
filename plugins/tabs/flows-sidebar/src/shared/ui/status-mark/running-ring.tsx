import { createElement as h } from "react";
import type { ReactElement } from "react";

const RING_PX = 12;

export function RunningRing(): ReactElement {
	return (
		<svg className="sumi-flows-ring" viewBox="0 0 16 16" width={RING_PX} height={RING_PX} aria-hidden="true">
			<circle className="sumi-flows-ring-track" cx="8" cy="8" r="5.5" />
			<path className="sumi-flows-ring-arc" d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" />
		</svg>
	);
}
