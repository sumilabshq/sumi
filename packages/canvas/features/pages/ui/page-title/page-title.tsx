import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { PageTitleQuery } from "../../contract.js";

const ONE_STATE = "1 state";
const STATES = "{count} states";

export function PageTitle(): ReactElement {
	const { page, states } = useQuery(PageTitleQuery).data;
	return (
		<>
			<b className="cv:truncate cv:text-base cv:font-medium">{page}</b>
			{states === null ? null : (
				<span className="cv:flex-none cv:text-xs cv:text-muted-foreground" data-canvas-states="">
					{statesLabelOf(states)}
				</span>
			)}
		</>
	);
}

function statesLabelOf(count: number): string {
	return count === 1 ? ONE_STATE : STATES.replace("{count}", String(count));
}
