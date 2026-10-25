import { createElement as h } from "react";
import type { ReactElement } from "react";

const RADIUS = 5.5;
const FULL = 2 * Math.PI * RADIUS;

export function UsageRing({ part }: { readonly part: number | null }): ReactElement {
	const shown = Math.min(1, Math.max(0, part ?? 0));
	return (
		<svg className="wg-studio-ai-usage-ring" aria-hidden="true" width="12" height="12" viewBox="0 0 14 14">
			<circle cx="7" cy="7" r={RADIUS} className="is-track" />
			{part === null ? null : (
				<circle
					cx="7"
					cy="7"
					r={RADIUS}
					className="is-used"
					strokeDasharray={`${(shown * FULL).toFixed(1)} ${FULL.toFixed(1)}`}
					transform="rotate(-90 7 7)"
				/>
			)}
		</svg>
	);
}
