import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useTreeDrag } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { AppTabsQuery, CloseTabCommand, MoveTabCommand, ShowTabCommand } from "../../contract.js";
import { NewTabMenu } from "../new-tab/new-tab-menu.js";
import { TabListRow } from "./tab-list-row.js";

const LIST = "cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-1";
const SCROLLER = "cv:relative cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-0.5 cv:overflow-y-auto cv:px-1";
const GROUP = "cv:m-0 cv:px-3.5 cv:pt-2.5 cv:pb-1 cv:text-sm cv:leading-[17px] cv:font-medium cv:text-muted-foreground";
const SLOT = "cv:pointer-events-none cv:absolute cv:inset-x-2 cv:h-0.5 cv:rounded-full cv:bg-info";
const ADD =
	"cv:flex cv:h-12 cv:w-full cv:cursor-pointer cv:items-center cv:gap-2.5 cv:rounded-full cv:border-0 cv:bg-transparent cv:py-0 cv:ps-3.5 cv:pe-4 cv:font-[inherit] cv:text-sm cv:font-medium cv:text-muted-foreground cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const PINNED = "Pinned apps";
const OPEN = "Open tabs";
const NEW_TAB = "New tab";
const AT_ONE_LEVEL_PX = 1000;

export function TabList(): ReactElement {
	const { tabs } = useQuery(AppTabsQuery).data;
	const showTab = useCommand(ShowTabCommand);
	const closeTab = useCommand(CloseTabCommand);
	const moveTab = useCommand(MoveTabCommand);
	const holder = useRef<HTMLDivElement | null>(null);
	const drag = useTreeDrag(holder, {
		indent: AT_ONE_LEVEL_PX,
		rebuilt: tabs,
		onDrop: ({ dragged, before }) => void moveTab.run({ id: dragged, before }),
	});
	const rowOf = (tab: (typeof tabs)[number]): ReactElement => (
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
	const trigger = (
		<button type="button" className={ADD} data-host-column-add="">
			<Icon name="plus" size={16} />
			{NEW_TAB}
		</button>
	);
	return (
		<div className={LIST} data-host-tab-list="">
			<div ref={holder} className={SCROLLER} data-host-column-scroll="">
				{pinned.length > 0 ? <p className={GROUP}>{PINNED}</p> : null}
				{pinned.map(rowOf)}
				{open.length > 0 ? <p className={GROUP}>{OPEN}</p> : null}
				{open.map(rowOf)}
				{drag.slot ? <span className={SLOT} style={{ top: drag.slot.top }} /> : null}
			</div>
			<NewTabMenu trigger={trigger} placement="over" />
		</div>
	);
}
