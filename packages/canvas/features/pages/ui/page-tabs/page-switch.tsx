import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { PageTabsQuery } from "../../contract.js";
import { PillSwitch } from "../../../../shared/ui/pill-switch/pill-switch.js";

export interface PageSwitchProps {
	readonly onPage: (page: string) => void;
}

export function PageSwitch({ onPage }: PageSwitchProps): ReactElement {
	const { tabs, shown } = useQuery(PageTabsQuery).data;
	const turnTo = (name: string): void => {
		const tab = tabs.find((one) => one.name === name);
		if (!tab) {
			return;
		}

		onPage(tab.opens);
	};

	return (
		<span className="cv:inline-flex" data-canvas-page-switch="">
			<PillSwitch<string>
				items={tabs.map(({ name }) => ({ value: name, label: name }))}
				value={shown}
				onValueChange={turnTo}
			/>
		</span>
	);
}
