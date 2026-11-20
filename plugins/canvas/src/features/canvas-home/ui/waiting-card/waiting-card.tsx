import { createElement as h } from "react";
import type { ReactElement } from "react";

export function WaitingCard(): ReactElement {
	return (
		<div className="sumi-canvas-card is-waiting" aria-hidden="true">
			<span className="sumi-canvas-card-cover" />
		</div>
	);
}
