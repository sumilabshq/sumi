import { createElement as h } from "react";
import type { ReactElement } from "react";

const CLOVER = "M1 0h2v1H1zM4 0h2v1H4zM0 1h3v2H0zM4 1h3v2H4zM3 3h1v1H3zM0 4h3v2H0zM4 4h3v2H4zM1 6h2v1H1zM4 6h2v1H4z";

export function CloverGlyph({ size }: { readonly size: number }): ReactElement {
	return (
		<svg viewBox="-.5 -.5 8 8" width={size} height={size} fill="currentColor" aria-hidden="true">
			<path d={CLOVER} />
		</svg>
	);
}
