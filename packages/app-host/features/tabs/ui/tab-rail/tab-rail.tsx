import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabTip } from "../../../../shared/ui/tab-tip/tab-tip.js";
import { AppTabsQuery, ShowTabCommand } from "../../contract.js";
import { NewTabMenu } from "../new-tab/new-tab-menu.js";

export interface TabRailProps {
	readonly tipSide: "left" | "right";
}

const RAIL = "cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:items-center cv:gap-1";
const SCROLLER =
	"cv:flex cv:min-h-0 cv:w-full cv:flex-1 cv:flex-col cv:items-center cv:gap-1 cv:overflow-y-auto cv:py-1 cv:[scrollbar-width:none]";
const DIVIDER = "cv:my-1 cv:h-px cv:w-6 cv:flex-none cv:bg-line";
const PICK =
	"cv:flex-none cv:cursor-pointer cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:text-ink cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const TAB_PICK = `${PICK} cv:h-auto`;
const ADD = `${PICK} cv:grid cv:size-10 cv:place-items-center`;
const NEW_TAB = "New tab";

export function TabRail({ tipSide }: TabRailProps): ReactElement {
	const { tabs } = useQuery(AppTabsQuery).data;
	const showTab = useCommand(ShowTabCommand);
	const pinned = tabs.filter((tab) => tab.isPinned);
	const open = tabs.filter((tab) => !tab.isPinned);
	const iconOf = (tab: AppTabState): ReactElement => (
		<TabTip key={tab.id} tab={tab} side={tipSide}>
			<button
				type="button"
				aria-label={tab.title}
				aria-current={tab.isShown || undefined}
				className={TAB_PICK}
				onClick={() => void showTab.run({ id: tab.id })}
				data-host-rail-tab={tab.id}
			>
				<TabIcon tab={tab} look={tab.isShown ? "rail-shown" : "rail"} />
			</button>
		</TabTip>
	);
	const trigger = (
		<Tip label={NEW_TAB}>
			<button type="button" aria-label={NEW_TAB} className={ADD} data-host-column-add="">
				<Icon name="plus" size={18} />
			</button>
		</Tip>
	);
	return (
		<div className={RAIL} data-host-rail="">
			<div className={SCROLLER} data-host-column-scroll="">
				{pinned.map(iconOf)}
				{pinned.length > 0 && open.length > 0 ? <span className={DIVIDER} aria-hidden="true" /> : null}
				<Fragment>{open.map(iconOf)}</Fragment>
			</div>
			<NewTabMenu trigger={trigger} placement="over" />
		</div>
	);
}
