import { useContext, useEffect } from "react";
import { REPORTS_DRAW_FAILURE } from "../draw-contexts.js";

export function useReportsDrawFailure(failure: unknown): void {
	const report = useContext(REPORTS_DRAW_FAILURE);
	useEffect(() => report?.(failure), [report, failure]);
}
