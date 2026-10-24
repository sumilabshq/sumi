import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useReportsDrawFailure } from "../../lib/use-reports-draw-failure.js";

export interface RefusedDrawingProps {
	readonly said: string;
	readonly failure: unknown;
}

export function RefusedDrawing({ said, failure }: RefusedDrawingProps): ReactElement {
	useReportsDrawFailure(failure);
	return <p className="wg-studio-refused cv:m-0 cv:text-base cv:text-[var(--wg-kit-error-ink)]">{said}</p>;
}
