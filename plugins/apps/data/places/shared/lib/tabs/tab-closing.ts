import type { HeldList } from "../../schema/tabs.schema.js";
import { holdsTabs } from "./app-abilities.js";
import { closedPlaceOf, keptClosed, reopenPlaceOf, withoutGroup } from "./host-tabs-moment.js";
import type { ClosedTab, HostTab, HostTabsMoment, TabPage } from "./host-tabs-moment.js";
import { flatTabIdsOf, pageTabIdsOf, tabOf } from "./host-tabs.js";
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

export function reopenClosed(moment: HostTabsMoment, chatId: string, tabId: string): ReopenedHostTab | null {
	const index = moment.closed.findIndex(({ tab }) => tab.id === tabId);
	const reopened = moment.closed[index];

	if (!reopened) {
		return null;
	}

	return {
		closed: reopened,
		moment: {
			...moment,
			...withHeldRestored(reopenedLayoutOf(moment, reopened, chatId), reopened),
			tabs: [...moment.tabs, reopened.tab, ...(reopened.held?.tabs ?? [])],
			shownId: reopened.tab.id,
			selectedId: reopened.tab.id,
			closed: moment.closed.filter((_closed, at) => at !== index),
		},
		reason: reopenSaid(reopened, chatId),
	};
}

function reopenSaid({ tab }: ClosedTab, chatId: string): string {
	return `reopen ${tab.id} in ${tab.essentialId === null ? chatId : "essentials"}`;
}

function reopenedLayoutOf(moment: HostTabsMoment, last: ClosedTab, chatId: string): TabLayout {
	if (last.tab.essentialId !== null) {
		return moment;
	}

	return withTabAt(moment, last.tab.id, reopenPlaceOf(moment, last, chatId));
}

function withHeldRestored(layout: TabLayout, { tab, held }: ClosedTab): TabLayout {
	if (held === null) {
		return layout;
	}

	return {
		lists: {
			...layout.lists,
			[tab.id]: held.entries,
		},
		groups: [...layout.groups, ...held.groups],
	};
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
		held: holdsTabs(moment.apps, tab) ? heldListOf(moment, tab.id, pages) : null,
	};
}

function heldListOf(moment: HostTabsMoment, holderId: string, pages: ReadonlyMap<string, TabPage>): HeldList {
	const entries = moment.lists[holderId] ?? [];
	const groupIds = new Set(entries.filter((entry) => entry.kind === "group").map((entry) => entry.id));
	return {
		tabs: flatTabIdsOf(moment, holderId).map((id) => restingTabOf(tabOf(moment, id), pages.get(id) ?? null)),
		entries: [...entries],
		groups: moment.groups
			.filter((group) => groupIds.has(group.id))
			.map((group) => ({ ...group, tabIds: [...group.tabIds] })),
	};
}

function restingTabOf(tab: HostTab, page: TabPage | null): HostTab {
	return {
		...tab,
		pageId: null,
		lastAddress: page?.address || tab.lastAddress,
	};
}

function closedMoment(
	moment: HostTabsMoment,
	ids: readonly string[],
	pages: ReadonlyMap<string, TabPage>,
): HostTabsMoment {
	const closed = ids.map((id) => closedOf(moment, tabOf(moment, id), pages));
	const leaving = leavingOf(closed);
	return {
		...moment,
		...layoutLeftBy(moment, closed, leaving),
		tabs: moment.tabs.filter((tab) => !leaving.tabs.has(tab.id)),
		shownId: survivingIdOf(moment, moment.shownId, leaving.tabs),
		selectedId: survivingIdOf(moment, moment.selectedId, leaving.tabs),
		closed: keptClosed(moment.apps, moment.closed, closed),
	};
}

function layoutLeftBy(moment: HostTabsMoment, closed: readonly ClosedTab[], leaving: Leaving): TabLayout {
	const layout = closed.reduce<TabLayout>((kept, { tab }) => withoutTab(kept, tab.id), moment);
	return {
		lists: Object.fromEntries(Object.entries(layout.lists).filter(([list]) => !leaving.lists.has(list))),
		groups: layout.groups.filter((group) => !leaving.groups.has(group.id)),
	};
}

interface Leaving {
	readonly tabs: ReadonlySet<string>;
	readonly lists: ReadonlySet<string>;
	readonly groups: ReadonlySet<string>;
}

function leavingOf(closed: readonly ClosedTab[]): Leaving {
	const heldLists = closed.flatMap(({ held }) => (held === null ? [] : [held]));
	const heldTabIds = heldLists.flatMap((held) => held.tabs.map((tab) => tab.id));
	return {
		tabs: new Set([...closed.map(({ tab }) => tab.id), ...heldTabIds]),
		lists: new Set(closed.filter(({ held }) => held !== null).map(({ tab }) => tab.id)),
		groups: new Set(heldLists.flatMap((held) => held.groups.map((group) => group.id))),
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
