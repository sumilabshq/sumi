import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { DesignSummaryQuery } from "../../features/pages/contract.js";

export function DesignSummary(): ReactElement {
	const { app, said } = useQuery(DesignSummaryQuery).data;
	return (
		<>
			<b>{app}</b>
			<span className="cv:text-muted-foreground">{said}</span>
		</>
	);
}
