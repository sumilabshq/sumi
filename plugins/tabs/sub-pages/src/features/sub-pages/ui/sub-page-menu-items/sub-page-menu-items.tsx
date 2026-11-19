import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { isChatTab, mainPageOf, pageEntriesOf, pageEntryOf } from "../../lib/page-entries.js";

export interface SubPageMenuItemsProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;
const PAGES_OFFERED = 3;
const MAKE_SUB_PAGE = "Make a sub-page of";
const TAKE_OUT = "Take out of {title}";

export function SubPageMenuItems({ tab, onDone }: SubPageMenuItemsProps): ReactElement {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const placeTab = useCommand(appHost.tabs.placeTab);
	const main = mainPageOf(sidebar, tab.id);
	const ownSubPages = pageEntryOf(sidebar, tab.id)?.subPages.length ?? 0;
	const placed = (asked: string, list: string): void => {
		onDone();
		void placeTab.run({ id: tab.id, to: { kind: "list", list, groupId: null, before: null } }).then((answer) => {
			if (!answer.ok) {
				console.warn(`[widgetarium] ${asked} refused: ${answer.reason}`);
			}
		});
	};
	const pages =
		main === null && ownSubPages === 0
			? pageEntriesOf(sidebar)
					.filter((page) => page.tab.id !== tab.id && isChatTab(page.tab))
					.slice(0, PAGES_OFFERED)
			: [];
	return (
		<>
			{main === null ? null : (
				<PopoverItem role="menuitem" onClick={() => placed(`taking ${tab.id} out of ${main.page.tab.id}`, main.list)}>
					<Icon name="arrow-up-left" size={ITEM_ICON_PX} />
					{TAKE_OUT.replace("{title}", main.page.tab.title)}
				</PopoverItem>
			)}
			{pages.map((page) => (
				<PopoverItem
					key={page.tab.id}
					role="menuitem"
					sub={page.tab.title}
					onClick={() => placed(`making ${tab.id} a sub-page of ${page.tab.id}`, page.tab.id)}
				>
					<Icon name="corner-down-right" size={ITEM_ICON_PX} />
					{MAKE_SUB_PAGE}
				</PopoverItem>
			))}
		</>
	);
}
