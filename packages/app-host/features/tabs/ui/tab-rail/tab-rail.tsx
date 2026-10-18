import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { DRAG_HOLDER } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { groupRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import { AppTabsQuery, ShowTabCommand } from "../../contract.js";
import { useTabDrag } from "../../lib/use-tab-drag.js";
import { RailNewTab } from "../rail-new-tab/rail-new-tab.js";
import { TabDropLine } from "../tab-drop-line/tab-drop-line.js";
import { TabRailIcon } from "./tab-rail-icon.js";

export interface TabRailProps {
	readonly tipSide: "left" | "right";
}

const RAIL = "cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:items-center cv:gap-1 cv:pb-1";
const SCROLLER = `${DRAG_HOLDER} cv:relative cv:flex cv:min-h-0 cv:w-full cv:flex-1 cv:flex-col cv:items-center cv:gap-1 cv:overflow-y-auto cv:py-1 cv:[scrollbar-width:none]`;
const UNSEEN_HOLDER = "cv:-my-0.5 cv:h-0 cv:w-full cv:flex-none";
const DIVIDER = "cv:my-1 cv:h-px cv:w-6 cv:flex-none cv:bg-line";

export function TabRail({ tipSide }: TabRailProps): ReactElement {
	const { tabs } = useQuery(AppTabsQuery).data;
	const showTab = useCommand(ShowTabCommand);
	const holder = useRef<HTMLDivElement | null>(null);
	const drag = useTabDrag(holder, tabs);
	const pinned = tabs.filter((tab) => tab.isPinned);
	const open = tabs.filter((tab) => !tab.isPinned);
	const iconOf = (tab: AppTabState): ReactElement => (
		<TabRailIcon
			key={tab.id}
			tab={tab}
			tipSide={tipSide}
			onPointerDown={(event) => drag.onPointerDown(event, tab.id, true)}
			onShow={() => {
				if (!drag.wasDragged()) void showTab.run({ id: tab.id });
			}}
		/>
	);
	return (
		<div className={RAIL} data-host-rail="">
			<div ref={holder} className={SCROLLER} data-host-column-scroll="">
				{pinned.length > 0 ? <span className={UNSEEN_HOLDER} {...groupRowProps("pinned")} aria-hidden="true" /> : null}
				{pinned.map(iconOf)}
				<span
					className={pinned.length > 0 ? DIVIDER : UNSEEN_HOLDER}
					{...groupRowProps("open")}
					aria-hidden="true"
					data-host-rail-divider=""
				/>
				{open.map(iconOf)}
				<TabDropLine slot={drag.slot} inset="rail" />
			</div>
			<RailNewTab />
		</div>
	);
}
