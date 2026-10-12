import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/mediator";
import { DesignSummaryQuery } from "../../requests/pages/design-summary.js";

export function DesignSummary(): ReactElement {
	const { app, said } = useQuery(DesignSummaryQuery).data;
	return (
		<>
			<b>{app}</b>
			<span className="cv:text-muted-foreground">{said}</span>
		</>
	);
}
