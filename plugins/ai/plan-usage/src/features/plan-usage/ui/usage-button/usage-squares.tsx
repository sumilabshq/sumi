import { createElement as h } from "react";
import type { ReactElement } from "react";

const SQUARES = 8;

export function UsageSquares({ part }: { readonly part: number | null }): ReactElement {
	const used = Math.round(Math.min(1, Math.max(0, part ?? 0)) * SQUARES);
	return (
		<span className="sumi-usage-squares" aria-hidden="true">
			{Array.from({ length: SQUARES }, (_square, at) => (
				<i key={at} className={at < used ? "" : "is-empty"} />
			))}
		</span>
	);
}
