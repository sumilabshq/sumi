import { PlacedTabsSchema, WindowSessionSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs, WindowSession, WindowView } from "../../schema/tabs.schema.js";
import type { KeptSplit } from "../../schema/splits.schema.js";
import { splitWithout } from "../splits/split-members.js";
import { isPageTab } from "./host-tabs.js";
import type { HostTab, HostTabsMoment, OpenedHostTab, OpenedTab } from "./host-tabs.js";
import { WORKSPACE_LIST, locationOf, windowOfList, withTabAt, withoutTab } from "./tab-lists.js";
import type { TabPlace } from "./tab-lists.js";

export interface TabNaming {
	readonly id: string;
	readonly place: TabPlace;
}

export function windowHoldingTab(placed: Pick<PlacedTabs, "lists" | "groups">, tabId: string): string | null {
	const list = locationOf(placed, tabId)?.chatId ?? null;
	return list === null ? null : windowOfList(list);
}

export function withTabFreed(placed: PlacedTabs, tabId: string, address: string): PlacedTabs | null {
	const tab = placed.tabs.find((one) => one.id === tabId) ?? sessionTabOf(placed.sessions, tabId);

	if (tab === undefined) {
		return null;
	}

	return PlacedTabsSchema.parse({
		...placed,
		...withoutTab(placed, tabId),
		tabs: placed.tabs.filter((one) => one.id !== tabId),
		views: Object.fromEntries(Object.entries(placed.views).map(([window, view]) => [window, viewWithout(view, tabId)])),
		splits: splitsWithout(placed.splits, tabId),
		sessions: placed.sessions.map((session) => sessionWithout(session, tabId)),
		closed: [...placed.closed, { tab: { ...tab, mark: tab.mark === "running" ? "none" : tab.mark }, chatId: null, groupId: null, at: 0, address }],
	});
}

export function listStartOf(moment: HostTabsMoment): TabPlace {
	return {
		chatId: WORKSPACE_LIST,
		groupId: null,
		before: moment.lists[WORKSPACE_LIST]?.[0]?.id ?? null,
	};
}

export function openTabAs(moment: HostTabsMoment, opened: OpenedTab, { id, place }: TabNaming): OpenedHostTab {
	const tab: HostTab = {
		...opened,
		id,
		label: null,
		lastAddress: null,
		title: null,
		mark: "none",
	};
	return {
		tab,
		moment: {
			...moment,
			...withTabAt(moment, id, place),
			tabs: [...moment.tabs, tab],
			closed: moment.closed.filter((closed) => closed.tab.id !== id),
			shownId: isPageTab(moment.apps, tab) ? id : moment.shownId,
			selectedId: id,
		},
		reason: `open ${id} (${opened.app}) once in ${place.chatId}`,
	};
}

function sessionTabOf(sessions: readonly WindowSession[], tabId: string): HostTab | undefined {
	return sessions.flatMap((session) => session.tabs).find((tab) => tab.id === tabId);
}

function viewWithout(view: WindowView, tabId: string): WindowView {
	return {
		...view,
		shownId: view.shownId === tabId ? null : view.shownId,
		selectedId: view.selectedId === tabId ? null : view.selectedId,
	};
}

function splitsWithout(splits: readonly KeptSplit[], tabId: string): KeptSplit[] {
	return splits.flatMap((split) => {
		const kept = splitWithout(split, (member) => member === tabId);
		return kept === null ? [] : [kept];
	});
}

function sessionWithout(session: WindowSession, tabId: string): WindowSession {
	return WindowSessionSchema.parse({
		...session,
		...withoutTab(session, tabId),
		tabs: session.tabs.filter((tab) => tab.id !== tabId),
		splits: splitsWithout(session.splits, tabId),
		view: session.view === null ? null : viewWithout(session.view, tabId),
	});
}
