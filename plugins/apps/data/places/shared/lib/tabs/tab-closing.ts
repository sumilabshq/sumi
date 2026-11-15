import { closedPlaceOf, keptClosed, reopenPlaceOf, withoutGroup } from "./host-tabs-moment.js";
import type { ClosedTab, HostTab, HostTabsMoment, TabPage } from "./host-tabs-moment.js";
import { pageTabIdsOf, tabOf } from "./host-tabs.js";
import type { MovedTabs } from "./host-tabs.js";
import { locationOf, withTabAt, withoutTab } from "./tab-lists.js";
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
	const closed = closedMoment(moment, group.tabIds, pages);
	return {
		moment: {
			...closed,
			...withoutGroup(closed, group.id, []),
		},
		reason: `close group ${group.id} with ${group.tabIds.length} tabs`,
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
			shownId: reopened.tab.id,
			selectedId: reopened.tab.id,
			closed: moment.closed.filter((_closed, at) => at !== index),
		},
		reason: reopenSaid(reopened),
	};
}

function reopenSaid({ tab, chatId }: ClosedTab): string {
	return `reopen ${tab.id} in ${tab.essentialId === null ? (chatId ?? "the open list") : "essentials"}`;
}

function reopenedLayoutOf(moment: HostTabsMoment, last: ClosedTab): TabLayout {
	if (last.tab.essentialId !== null) {
		return moment;
	}

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
	const closed = ids.map((id) => closedOf(moment, tabOf(moment, id), pages));
	const leaving = new Set(closed.map(({ tab }) => tab.id));
	return {
		...moment,
		...closed.reduce<TabLayout>((kept, { tab }) => withoutTab(kept, tab.id), moment),
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
	const isStaying = (one: string): boolean => !leaving.has(one);
	return ids.slice(at + 1).find(isStaying) ?? ids.slice(0, at).reverse().find(isStaying) ?? null;
}
