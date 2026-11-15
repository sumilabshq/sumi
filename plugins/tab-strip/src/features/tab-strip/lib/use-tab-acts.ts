import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { copyLink } from "./copy-link.js";
import type { DragAim } from "./drag-aim.js";
import { stripDropOf } from "./strip-drop.js";
import { isShownItem, itemIdOf, memberIdsOf, tabOf } from "./strip-items.js";
import type { StripItem } from "./strip-items.js";

export interface TabActs {
	readonly show: (item: StripItem) => void;
	readonly close: (item: StripItem) => void;
	readonly duplicate: (item: StripItem) => void;
	readonly closeOthers: (item: StripItem) => void;
	readonly tearOff: (tab: AppTabState) => void;
	readonly copyLink: (tab: AppTabState) => void;
	readonly drop: (item: StripItem, aim: DragAim) => void;
}

export interface StripFacts {
	readonly items: readonly StripItem[];
	readonly newTabList: string;
}

export function useTabActs({ items, newTabList }: StripFacts): TabActs {
	const showTab = useCommand(appHost.tabs.showTab);
	const placeTab = useCommand(appHost.tabs.placeTab);
	const closeTabs = useCommand(appHost.tabActions.closeTabs);
	const duplicate = useCommand(appHost.tabActions.duplicate);
	const closeOthers = useCommand(appHost.tabActions.closeOthers);
	const tearOff = useCommand(appHost.tabActions.tearOff);
	const placeInView = useCommand(appHost.splits.placeInView);
	const tearOffTab = (tab: AppTabState): void => void tearOff.run({ id: tab.id });
	return {
		show: (item) => void showTab.run({ id: tabOf(item).id }),
		close: (item) => void closeTabs.run({ ids: memberIdsOf(item) }),
		duplicate: (item) => void duplicate.run({ id: tabOf(item).id }),
		closeOthers: (item) => void closeOthers.run({ id: tabOf(item).id }),
		tearOff: tearOffTab,
		copyLink: ({ address }) => {
			if (address !== null) {
				copyLink(address);
			}
		},
		drop: (item, aim) => {
			const id = tabOf(item).id;

			if (aim.kind === "strip") {
				const others = items.filter((other) => itemIdOf(other) !== itemIdOf(item));
				void placeTab.run({
					id,
					to: stripDropOf({
						others,
						index: aim.index,
						newTabList,
					}),
				});
				return;
			}

			if (aim.kind === "split") {
				void placeInView.run({
					tabId: id,
					targetTabId: besideOf(items, item),
					side: aim.side,
					isPaneMoved: false,
				});
				return;
			}

			if (aim.kind === "away") {
				tearOffTab(tabOf(item));
			}
		},
	};
}

function besideOf(items: readonly StripItem[], dragged: StripItem): string | null {
	const draggedId = tabOf(dragged).id;
	const shown = items.find((item) => isShownItem(item) && tabOf(item).id !== draggedId);

	if (shown !== undefined) {
		return tabOf(shown).id;
	}

	const at = items.indexOf(dragged);
	const neighbour = items[at - 1] ?? items[at + 1];
	return neighbour === undefined ? null : tabOf(neighbour).id;
}
