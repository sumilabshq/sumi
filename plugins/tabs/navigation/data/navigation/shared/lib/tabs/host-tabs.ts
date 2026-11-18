import type { PageApp } from "../../schema/tabs.schema.js";
import {
	WORKSPACE_LIST,
	chatOfGroup,
	flatTabIdsOf,
	findGroup,
	groupsUnder,
	isSectionList,
	placeAfterOf,
	sectionNameOf,
	locationOf,
	tabIdsOfGroup,
	withTabAt,
	withoutTab,
} from "./tab-lists.js";
import type { TabPlace } from "./tab-lists.js";
import { labelSaid } from "./host-tabs-moment.js";
import type { HostTab, HostTabsMoment, OpenedTab } from "./host-tabs-moment.js";
import { abilitiesOf, isChatTab } from "./app-abilities.js";
import type { PlacedApps } from "./app-abilities.js";

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

export interface PageGiving {
	readonly id: string;
	readonly pageId: string;
	readonly why: string;
}

const NO_TAB = 'the host holds no tab "{id}"';
const PAGE_HELD = 'the browser page "{page}" already belongs to the tab "{id}"';
const PAGE_GIVEN = 'the tab "{id}" already has the browser page "{page}"';

export function heldTabOf(moment: HostTabsMoment, id: string): HostTab | undefined {
	return moment.tabs.find((tab) => tab.id === id) ?? moment.tabs.find((tab) => chatIdOf(moment.apps, tab) === id);
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
	const tab = mintTab(moment, opened);
	return {
		tab,
		moment: {
			...moment,
			...withTabAt(moment, tab.id, place),
			tabs: [...moment.tabs, tab],
			shownId: tab.id,
			selectedId: tab.id,
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
			selectedId: moment.selectedId,
		},
	};
}

export function chatIdOf(apps: PlacedApps, tab: Pick<HostTab, "id" | "app" | "lastAddress">): string | null {
	if (!isChatTab(apps, tab)) {
		return null;
	}

	return tab.lastAddress ?? tab.id;
}

export function isPageTab(apps: PlacedApps, tab: HostTab): boolean {
	return abilitiesOf(apps, tab.app).runsInPage;
}

export function isKnownList(listId: string): boolean {
	return sectionNameOf(listId) !== null;
}

export function pageTabIdsOf(moment: HostTabsMoment, listId: string): readonly string[] {
	const pageIds = new Set(moment.tabs.filter((tab) => isPageTab(moment.apps, tab)).map((tab) => tab.id));
	return flatTabIdsOf(moment, listId).filter((id) => pageIds.has(id));
}

export function topPageTabIdsOf(moment: HostTabsMoment): readonly string[] {
	return pageTabIdsOf(moment, WORKSPACE_LIST);
}

export function newTabPlaceOf(asked: string | null): TabPlace {
	return {
		chatId: asked !== null && isSectionList(asked) ? asked : WORKSPACE_LIST,
		groupId: null,
		before: null,
	};
}

export function openTabAfter(moment: HostTabsMoment, afterId: string, opened: OpenedTab): OpenedHostTab | null {
	const place = placeAfterOf(moment, afterId);
	return place === null ? null : openTab(moment, opened, place);
}

export function markShown(moment: HostTabsMoment, id: string): MovedTabs | null {
	tabOf(moment, id);

	if (moment.shownId === id && moment.selectedId === id) {
		return null;
	}

	return {
		moment: {
			...moment,
			shownId: id,
			selectedId: id,
		},
		reason: `show ${id}`,
	};
}

export function markSelected(moment: HostTabsMoment, id: string): MovedTabs | null {
	tabOf(moment, id);

	if (moment.selectedId === id) {
		return null;
	}

	return {
		moment: {
			...moment,
			selectedId: id,
		},
		reason: `select ${id} (was ${moment.selectedId ?? "nothing"})`,
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
			tabs: tabsWith(moment, id, { label }),
		},
		reason: `rename ${id}, ${labelSaid(renamed.label)} → ${labelSaid(label)}`,
	};
}

export function placeTab(moment: HostTabsMoment, id: string, place: TabPlace): MovedTabs | null {
	tabOf(moment, id);

	if (place.before === id) {
		return null;
	}

	return {
		moment: {
			...moment,
			...withTabAt(withoutTab(moment, id), id, place),
		},
		reason: `place ${id} in ${place.chatId}/${place.groupId ?? "list"} before ${place.before ?? "the end"}`,
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
			tabs: tabsWith(moment, id, { pageId }),
		},
		reason: `${id} page none → ${pageId}, ${why}`,
	};
}

export function momentSaid(moment: HostTabsMoment): string {
	const split = moment.shownSplitId === null ? "" : ` in ${moment.shownSplitId}`;
	return `${moment.tabs.length} tabs, ${moment.groups.length} groups, ${moment.splits.length} splits, shown ${moment.shownId}${split}`;
}

export function tabsWith(moment: HostTabsMoment, id: string, change: Partial<HostTab>): readonly HostTab[] {
	return moment.tabs.map((tab) =>
		tab.id === id
			? {
					...tab,
					...change,
				}
			: tab,
	);
}

function mintTab(moment: HostTabsMoment, opened: OpenedTab): HostTab {
	return {
		...opened,
		id: `tab-${moment.minted + 1}`,
		label: null,
		lastAddress: null,
		title: null,
		mark: "none",
	};
}

export { chatOfGroup, findGroup, flatTabIdsOf, groupsUnder, tabIdsOfGroup };
