import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { DRAG_HOLDER } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { AppTabsQuery, CloseTabCommand, ShowTabCommand } from "../../contract.js";
import { useTabDrag } from "../../lib/use-tab-drag.js";
import { ColumnNewTab } from "../column-new-tab/column-new-tab.js";
import { TabDropLine } from "../tab-drop-line/tab-drop-line.js";
import { TabGroupHeading } from "../tab-group-heading/tab-group-heading.js";
import { TabListRow } from "./tab-list-row.js";

const LIST = "cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-1";
const SCROLLER = `${DRAG_HOLDER} cv:relative cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-0.5 cv:overflow-y-auto`;
const FOOT = "cv:flex-none";

export function TabList(): ReactElement {
	const { tabs } = useQuery(AppTabsQuery).data;
	const showTab = useCommand(ShowTabCommand);
	const closeTab = useCommand(CloseTabCommand);
	const holder = useRef<HTMLDivElement | null>(null);
	const drag = useTabDrag(holder, tabs);
	const rowOf = (tab: AppTabState): ReactElement => (
		<TabListRow
			key={tab.id}
			tab={tab}
			onPointerDown={(event) => drag.onPointerDown(event, tab.id, true)}
			onShow={() => {
				if (!drag.wasDragged()) void showTab.run({ id: tab.id });
			}}
			onClose={() => void closeTab.run({ id: tab.id })}
		/>
	);
	const pinned = tabs.filter((tab) => tab.isPinned);
	const open = tabs.filter((tab) => !tab.isPinned);
	return (
		<div className={LIST} data-host-tab-list="">
			<div ref={holder} className={SCROLLER} data-host-column-scroll="">
				{pinned.length > 0 ? <TabGroupHeading group="pinned" /> : null}
				{pinned.map(rowOf)}
				{open.length > 0 ? <TabGroupHeading group="open" /> : null}
				{open.map(rowOf)}
				<TabDropLine slot={drag.slot} inset="row" />
			</div>
			<div className={FOOT}>
				<ColumnNewTab />
			</div>
		</div>
	);
}
