import { createElement as h, useContext, useEffect } from "react";
import type { ReactElement } from "react";
import { REPORTS_DRAW_FAILURE } from "./draw-contexts.js";

export interface RefusedDrawingProps {
	readonly said: string;
	readonly failure: unknown;
}

export function RefusedDrawing({ said, failure }: RefusedDrawingProps): ReactElement {
	const report = useContext(REPORTS_DRAW_FAILURE);
	useEffect(() => report?.(failure), [report, failure]);
	return <p className="wg-studio-refused cv:m-0 cv:text-base cv:text-[var(--wg-kit-error-ink)]">{said}</p>;
}
