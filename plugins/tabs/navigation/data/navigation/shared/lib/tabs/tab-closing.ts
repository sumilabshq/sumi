import { closedPlaceOf, keptClosed, reopenPlaceOf, withoutGroup } from "./host-tabs-moment.js";
import type { ClosedTab, HostTab, HostTabsMoment, TabPage } from "./host-tabs-moment.js";
import { isPageTab, pageTabIdsOf, tabOf } from "./host-tabs.js";
import { withArtifactsOf } from "./chat-lists.js";
import type { MovedTabs } from "./host-tabs.js";
import { groupsUnder, locationOf, tabIdsOfGroup, withTabAt, withoutTab } from "./tab-lists.js";
import type { TabGroup, TabLayout } from "./tab-lists.js";

export interface ReopenedHostTab extends MovedTabs {
	readonly closed: ClosedTab;
}

export interface TabsClosing {
	readonly ids: readonly string[];
	readonly reason: string;
}

export function closeTabs(
	moment: HostTabsMoment,
	pages: ReadonlyMap<string, TabPage>,
	{ ids, reason }: TabsClosing,
): MovedTabs {
	return {
		moment: closedMoment(moment, ids, pages),
		reason,
	};
}

export function closeGroup(moment: HostTabsMoment, group: TabGroup, pages: ReadonlyMap<string, TabPage>): MovedTabs {
	const tabIds = tabIdsOfGroup(moment.groups, group);
	const closed = closedMoment(moment, tabIds, pages);
	const gone = [group, ...groupsUnder(moment.groups, group.entries, new Set([group.id]))];
	return {
		moment: {
			...closed,
			...gone.reduce<TabLayout>((kept, { id }) => withoutGroup(kept, id, []), closed),
		},
		reason: `close group ${group.id} with ${tabIds.length} tabs and ${gone.length - 1} groups inside`,
	};
}

export function reopenClosed(moment: HostTabsMoment, tabId: string): ReopenedHostTab | null {
	const index = moment.closed.findIndex(({ tab }) => tab.id === tabId);
	const reopened = moment.closed[index];

	if (!reopened) {
		return null;
	}

	return {
		closed: reopened,
		moment: {
			...moment,
			...reopenedLayoutOf(moment, reopened),
			tabs: [...moment.tabs, reopened.tab],
			shownId: isPageTab(moment.apps, reopened.tab) ? reopened.tab.id : moment.shownId,
			selectedId: reopened.tab.id,
			closed: moment.closed.filter((_closed, at) => at !== index),
		},
		reason: reopenSaid(reopened),
	};
}

function reopenSaid({ tab, chatId }: ClosedTab): string {
	return `reopen ${tab.id} in ${chatId ?? "the open list"}`;
}

function reopenedLayoutOf(moment: HostTabsMoment, last: ClosedTab): TabLayout {
	return withTabAt(moment, last.tab.id, reopenPlaceOf(moment, last));
}

function closedOf(moment: HostTabsMoment, tab: HostTab, pages: ReadonlyMap<string, TabPage>): ClosedTab {
	const page = pages.get(tab.id) ?? null;
	return {
		tab: {
			...tab,
			pageId: page?.pageId ?? tab.pageId,
			mark: tab.mark === "running" ? "none" : tab.mark,
		},
		...closedPlaceOf(locationOf(moment, tab.id)),
		address: page?.address ?? "",
	};
}

function closedMoment(
	moment: HostTabsMoment,
	ids: readonly string[],
	pages: ReadonlyMap<string, TabPage>,
): HostTabsMoment {
	const closed = withArtifactsOf(moment, ids).map((id) => closedOf(moment, tabOf(moment, id), pages));
	const leaving = new Set(closed.map(({ tab }) => tab.id));
	const layout = closed.reduce<TabLayout>((kept, { tab }) => withoutTab(kept, tab.id), moment);
	return {
		...moment,
		...layout,
		lists: Object.fromEntries(Object.entries(layout.lists).filter(([list]) => !leaving.has(list))),
		tabs: moment.tabs.filter((tab) => !leaving.has(tab.id)),
		shownId: survivingIdOf(moment, moment.shownId, leaving),
		selectedId: survivingIdOf(moment, moment.selectedId, leaving),
		closed: keptClosed(moment.apps, moment.closed, closed),
	};
}

function survivingIdOf(moment: HostTabsMoment, id: string | null, closingIds: ReadonlySet<string>): string | null {
	if (id === null || !closingIds.has(id)) {
		return id;
	}

	return neighbourOf(moment, id, closingIds);
}

function neighbourOf(moment: HostTabsMoment, id: string, leaving: ReadonlySet<string>): string | null {
	const chatId = locationOf(moment, id)?.chatId;

	if (chatId === undefined) {
		return null;
	}

	const ids = pageTabIdsOf(moment, chatId);
	const at = ids.indexOf(id);
	const isStaying = (one: string): boolean => !leaving.has(one) && !moment.heldElsewhere.has(one);
	return ids.slice(at + 1).find(isStaying) ?? ids.slice(0, at).reverse().find(isStaying) ?? null;
}
