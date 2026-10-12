import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useReportsFailure } from "./use-reports-failure.js";

export interface RefusedDrawingProps {
	readonly said: string;
	readonly failure: unknown;
}

export function RefusedDrawing({ said, failure }: RefusedDrawingProps): ReactElement {
	useReportsFailure(failure);
	return h("p", { className: "wg-studio-refused" }, said);
}
