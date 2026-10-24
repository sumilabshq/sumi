import { createElement as h } from "react";
import type { ReactElement } from "react";

const BLUR_STEPS = ["is-near", "is-mid", "is-far"] as const;

export function PlateStrip(): ReactElement {
	return (
		<span className="wg-plate-strip" aria-hidden="true">
			<span className="wg-plate-strip-image" />
			{BLUR_STEPS.map((step) => (
				<span key={step} className={`wg-plate-strip-blur ${step}`} />
			))}
			<span className="wg-plate-strip-veil" />
		</span>
	);
}
