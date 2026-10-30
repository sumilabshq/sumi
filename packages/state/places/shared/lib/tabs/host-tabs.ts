import type { PageApp } from "../../schema/tabs.schema.js";
import {
	PINNED_LIST,
	WORKSPACE_LIST,
	chatOfGroup,
	flatTabIdsOf,
	findGroup,
	isSectionList,
	placeAfterOf,
	locationOf,
	withTabAt,
	withoutTab,
} from "./tab-lists.js";
import type { TabGroup, TabLayout, TabPlace } from "./tab-lists.js";
import {
	closedPlaceOf,
	keptClosed,
	labelSaid,
	lastShownWith,
	reopenPlaceOf,
	withoutGroup,
} from "./host-tabs-moment.js";
import type { ClosedTab, HostTab, HostTabsMoment, OpenedTab, TabPage } from "./host-tabs-moment.js";

export type { TabGroup, TabPlace } from "./tab-lists.js";

export type { ClosedTab, GroupChange, HostTab, HostTabsMoment, OpenedTab, TabPage } from "./host-tabs-moment.js";
export { CLOSED_KEPT, emptyMoment } from "./host-tabs-moment.js";

export type PageTab = HostTab & { readonly app: PageApp };

export interface MovedTabs {
	readonly moment: HostTabsMoment;
	readonly reason: string;
}

export interface OpenedHostTab extends MovedTabs {
	readonly tab: HostTab;
}

export interface ReopenedHostTab extends MovedTabs {
	readonly closed: ClosedTab;
}

export interface TabsClosing {
	readonly ids: readonly string[];
	readonly reason: string;
}

export interface PageGiving {
	readonly id: string;
	readonly pageId: string;
	readonly why: string;
}

const NO_TAB = 'the host holds no tab "{id}"';
const PAGE_HELD = 'the browser page "{page}" already belongs to the tab "{id}"';
const PAGE_GIVEN = 'the tab "{id}" already has the browser page "{page}"';

export function heldTabOf(moment: HostTabsMoment, id: string): HostTab | undefined {
	return moment.tabs.find((tab) => tab.id === id);
}

export function tabOf(moment: HostTabsMoment, id: string): HostTab {
	const found = heldTabOf(moment, id);

	if (!found) {
		throw new Error(NO_TAB.replace("{id}", id));
	}

	return found;
}

export function chatOfTab(moment: HostTabsMoment, tabId: string): string | null {
	return locationOf(moment, tabId)?.chatId ?? null;
}

export function openTab(moment: HostTabsMoment, opened: OpenedTab, place: TabPlace): OpenedHostTab {
	const tab = mintTab(moment, opened, null);
	return {
		tab,
		moment: {
			...moment,
			...withTabAt(moment, tab.id, place),
			tabs: [...moment.tabs, tab],
			shownId: tab.id,
			lastShown: lastShownWith(moment.lastShown, place.chatId, tab.id),
			minted: moment.minted + 1,
		},
		reason: `open ${tab.id} (${tab.app}) in ${place.chatId}${place.groupId === null ? "" : `/${place.groupId}`}`,
	};
}

export function openTabUnshown(moment: HostTabsMoment, opened: OpenedTab, place: TabPlace): OpenedHostTab {
	const shown = openTab(moment, opened, place);
	return {
		...shown,
		moment: {
			...shown.moment,
			shownId: moment.shownId,
			lastShown: moment.lastShown,
		},
	};
}

export function isPageTab(tab: HostTab): tab is PageTab {
	return tab.app !== "chat";
}

export function isChatTabId(moment: HostTabsMoment, id: string): boolean {
	return moment.tabs.some((tab) => tab.id === id && tab.app === "chat");
}

export function isKnownList(moment: HostTabsMoment, listId: string): boolean {
	return isSectionList(listId) || isChatTabId(moment, listId);
}

export function pageTabIdsOf(moment: HostTabsMoment, listId: string): readonly string[] {
	const pageIds = new Set(moment.tabs.filter(isPageTab).map((tab) => tab.id));
	return flatTabIdsOf(moment, listId).filter((id) => pageIds.has(id));
}

export function topPageTabIdsOf(moment: HostTabsMoment): readonly string[] {
	return [...pageTabIdsOf(moment, WORKSPACE_LIST), ...pageTabIdsOf(moment, PINNED_LIST)];
}

export function newTabPlaceOf(moment: HostTabsMoment, asked: string | null): TabPlace {
	const shownList = moment.shownId === null ? null : (locationOf(moment, moment.shownId)?.chatId ?? null);
	return {
		chatId: asked ?? (shownList === null || isSectionList(shownList) ? WORKSPACE_LIST : shownList),
		groupId: null,
		before: null,
	};
}

export function openTabAfter(moment: HostTabsMoment, afterId: string, opened: OpenedTab): OpenedHostTab | null {
	const place = placeAfterOf(moment, afterId);
	return place === null ? null : openTab(moment, opened, place);
}

export function openEssentialTab(moment: HostTabsMoment, essentialId: string, opened: OpenedTab): OpenedHostTab {
	const tab = mintTab(moment, opened, essentialId);
	return {
		tab,
		moment: {
			...moment,
			tabs: [...moment.tabs, tab],
			shownId: tab.id,
			minted: moment.minted + 1,
		},
		reason: `open ${tab.id} for essential ${essentialId}`,
	};
}

export function markShown(moment: HostTabsMoment, id: string): MovedTabs | null {
	tabOf(moment, id);

	if (moment.shownId === id) {
		return null;
	}

	const chatId = chatOfTab(moment, id);
	return {
		moment: {
			...moment,
			shownId: id,
			lastShown: chatId === null ? moment.lastShown : lastShownWith(moment.lastShown, chatId, id),
		},
		reason: `show ${id}`,
	};
}

export function markChatTabShown(moment: HostTabsMoment, id: string, chatId: string): MovedTabs | null {
	if (moment.lastShown[chatId] === id) {
		return null;
	}

	return {
		moment: {
			...moment,
			lastShown: lastShownWith(moment.lastShown, chatId, id),
		},
		reason: `show ${id} in chat ${chatId}`,
	};
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
			...reopenedLayoutOf(moment, reopened, chatId),
			tabs: [...moment.tabs, reopened.tab],
			shownId: reopened.tab.id,
			closed: moment.closed.filter((_closed, at) => at !== index),
		},
		reason: `reopen ${reopened.tab.id} in ${reopened.tab.essentialId === null ? chatId : "essentials"}`,
	};
}

export function renameTab(moment: HostTabsMoment, id: string, typed: string): MovedTabs | null {
	const renamed = tabOf(moment, id);
	const label = typed.trim() || null;

	if (renamed.label === label) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: withTab(moment, id, { label }),
		},
		reason: `rename ${id}, ${labelSaid(renamed.label)} → ${labelSaid(label)}`,
	};
}

export function placeTab(moment: HostTabsMoment, id: string, place: TabPlace): MovedTabs | null {
	const moved = tabOf(moment, id);

	if (place.before === id) {
		return null;
	}

	const wasEssential = moved.essentialId === null ? "" : `, was essential ${moved.essentialId}`;
	return {
		moment: {
			...moment,
			...withTabAt(withoutTab(moment, id), id, place),
			tabs: withTab(moment, id, { essentialId: null }),
		},
		reason: `place ${id} in ${place.chatId}/${place.groupId ?? "list"} before ${place.before ?? "the end"}${wasEssential}`,
	};
}

export function givePage(moment: HostTabsMoment, { id, pageId, why }: PageGiving): MovedTabs | null {
	const tab = tabOf(moment, id);
	const holder = moment.tabs.find((one) => one.pageId === pageId && one.id !== id);

	if (holder) {
		throw new Error(PAGE_HELD.replace("{page}", pageId).replace("{id}", holder.id));
	}

	if (tab.pageId === pageId) {
		return null;
	}

	if (tab.pageId !== null) {
		throw new Error(PAGE_GIVEN.replace("{id}", id).replace("{page}", tab.pageId));
	}

	return {
		moment: {
			...moment,
			tabs: withTab(moment, id, { pageId }),
		},
		reason: `${id} page none → ${pageId}, ${why}`,
	};
}

export function makeEssential(moment: HostTabsMoment, id: string, essentialId: string): MovedTabs {
	tabOf(moment, id);
	return {
		moment: {
			...moment,
			...withoutTab(moment, id),
			tabs: withTab(moment, id, { essentialId }),
		},
		reason: `${id} becomes essential ${essentialId}`,
	};
}

export function momentSaid(moment: HostTabsMoment): string {
	return `${moment.tabs.length} tabs, ${moment.groups.length} groups, shown ${moment.shownId}`;
}

function mintTab(moment: HostTabsMoment, opened: OpenedTab, essentialId: string | null): HostTab {
	return {
		...opened,
		id: `tab-${moment.minted + 1}`,
		label: null,
		essentialId,
		lastAddress: null,
		lastTitle: null,
		lastFavicon: null,
	};
}

function withTab(moment: HostTabsMoment, id: string, change: Partial<HostTab>): readonly HostTab[] {
	return moment.tabs.map((tab) =>
		tab.id === id
			? {
					...tab,
					...change,
				}
			: tab,
	);
}

function reopenedLayoutOf(moment: HostTabsMoment, last: ClosedTab, chatId: string): TabLayout {
	if (last.tab.essentialId !== null) {
		return moment;
	}

	return withTabAt(moment, last.tab.id, reopenPlaceOf(moment, last, chatId));
}

function closedOf(moment: HostTabsMoment, tab: HostTab, page: TabPage | null): ClosedTab {
	return {
		tab: {
			...tab,
			pageId: page?.pageId ?? tab.pageId,
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
	const closing = ids.map((id) => tabOf(moment, id));
	const closingIds = new Set(ids);
	const layout = closing.reduce<TabLayout>((kept, tab) => withoutTab(kept, tab.id), moment);
	return {
		...moment,
		...layout,
		tabs: moment.tabs.filter((tab) => !closingIds.has(tab.id)),
		shownId: shownAfterClosing(moment, closingIds),
		closed: keptClosed(
			moment.closed,
			closing.map((tab) => closedOf(moment, tab, pages.get(tab.id) ?? null)),
		),
	};
}

function shownAfterClosing(moment: HostTabsMoment, closingIds: ReadonlySet<string>): string | null {
	const { shownId } = moment;

	if (shownId === null || !closingIds.has(shownId)) {
		return shownId;
	}

	return neighbourOf(moment, shownId, closingIds);
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

export { chatOfGroup, findGroup, flatTabIdsOf };
