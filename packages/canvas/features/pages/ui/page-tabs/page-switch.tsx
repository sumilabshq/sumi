import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/requests";
import { PageTabsQuery } from "../../contract.js";

export interface PageSwitchProps {
	readonly onPage: (page: string) => void;
}

const SWITCH =
	"cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)] cv:[&_button]:h-[calc(var(--wg-kit-control-s)-4px)]";

export function PageSwitch({ onPage }: PageSwitchProps): ReactElement {
	const { tabs, shown } = useQuery(PageTabsQuery).data;
	return (
		<span className="cv:inline-flex" data-canvas-page-switch="">
			<Segmented<string>
				items={tabs.map((page) => ({ value: page, label: page }))}
				value={shown}
				onValueChange={onPage}
				size="s"
				className={SWITCH}
			/>
		</span>
	);
}
