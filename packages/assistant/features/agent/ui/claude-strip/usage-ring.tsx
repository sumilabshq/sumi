import { createElement as h } from "react";
import type { ReactElement } from "react";

const RADIUS = 7;
const FULL = 2 * Math.PI * RADIUS;

export function UsageRing({ part }: { readonly part: number | null }): ReactElement {
	const shown = Math.min(1, Math.max(0, part ?? 0));
	return (
		<svg className="wg-studio-ai-usage-ring" aria-hidden="true" width="18" height="18" viewBox="0 0 20 20">
			<circle cx="10" cy="10" r={RADIUS} className="is-track" />
			{part === null ? null : (
				<circle
					cx="10"
					cy="10"
					r={RADIUS}
					className="is-used"
					strokeDasharray={`${(shown * FULL).toFixed(1)} ${FULL.toFixed(1)}`}
					transform="rotate(-90 10 10)"
				/>
			)}
		</svg>
	);
}
