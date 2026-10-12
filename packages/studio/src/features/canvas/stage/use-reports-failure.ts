import { createContext, useContext, useEffect } from "react";

export const REPORTS_DRAW_FAILURE = createContext<((failure: unknown) => void) | null>(null);

export function useReportsFailure(failure: unknown): void {
	const report = useContext(REPORTS_DRAW_FAILURE);
	useEffect(() => report?.(failure), [report, failure]);
}
