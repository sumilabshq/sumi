import { useContext, useEffect } from "react";
import { REPORTS_DRAW_FAILURE } from "./draw-contexts.js";

const UNREPORTED = "[widgetarium] a drawing failed with no frame to report it to";

export function useReportsDrawFailure(failure: unknown): void {
	const report = useContext(REPORTS_DRAW_FAILURE);
	useEffect(() => {
		if (report === null) {
			console.error(UNREPORTED, failure);
			return;
		}

		report(failure);
	}, [report, failure]);
}
