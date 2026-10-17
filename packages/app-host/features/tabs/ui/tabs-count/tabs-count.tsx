import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { AppTabsQuery } from "../../contract.js";

const TABS = "Tabs";
const SAID = "cv:block cv:text-base cv:leading-[18px] cv:font-semibold cv:text-ink";
const COUNT = "cv:ms-1.5 cv:font-normal cv:text-muted-foreground";

export function TabsCount(): ReactElement {
	const { tabs } = useQuery(AppTabsQuery).data;
	return (
		<span className={SAID} data-host-tabs-count="">
			{TABS}
			<span className={COUNT}>{tabs.length}</span>
		</span>
	);
}
