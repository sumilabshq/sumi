import type { ListEntry, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import type { TabsAsk } from "../../../shared/schema/screen.schema.js";
import { isRefusal, movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, Refusal, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withTabsClosed } from "../../../shared/lib/showing/closing.js";
import { tabFactsOf } from "../../../shared/lib/showing/tab-facts.js";
import { tabPagesOf } from "../../../shared/lib/showing/tab-pages.js";
import { isChatTab } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { findGroup, groupsUnder, heldTabOf, tabIdsOfGroup } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, TabGroup, TabPage } from "../../../shared/lib/tabs/host-tabs.js";
import { withoutGroup } from "../../../shared/lib/tabs/host-tabs-moment.js";
import { momentAt } from "../../../shared/lib/tabs/kept-tabs.js";
import { withSubPagesOf } from "../../../shared/lib/tabs/sub-pages.js";
import { holderLabelOf } from "../../../shared/lib/tabs/tab-leases.js";
import { WORKSPACE_LIST, withEntryBefore, withoutEntry } from "../../../shared/lib/tabs/tab-lists.js";
import type { ChatLists, TabLayout } from "../../../shared/lib/tabs/tab-lists.js";

export interface CarriedTabs {
	readonly entry: ListEntry;
	readonly tabs: readonly HostTab[];
	readonly groups: readonly TabGroup[];
	readonly pageLists: ChatLists;
}

export interface ArrivedTabs {
	readonly entry: ListEntry;
	readonly tabIds: readonly string[];
	readonly groupIds: readonly string[];
}

interface CarriedRoot {
	readonly tabIds: readonly string[];
	readonly groups: readonly TabGroup[];
}

const SAME_WORKSPACE = "the {kind} is in this workspace already";
const NO_TAB = 'the host holds no tab "{id}"';
const NO_GROUP = 'no group "{id}"';
const CHAT_STAYS = 'the tab "{title}" is a chat: a chat stays in the workspace that keeps its conversation';
const HELD_ELSEWHERE = 'the tab "{title}" is open in window {window}: only that window moves it';
const CHANGED_MEANWHILE = "the {kind} changed while it moved, so it stays here";

export function refuseWorkspaceMove(entry: ListEntry, from: string, to: string): string | null {
	return from === to ? SAME_WORKSPACE.replace("{kind}", entry.kind) : null;
}

export function carriedAt(placed: PlacedTabs, at: TabsAsk, apps: PlacedApps, entry: ListEntry): CarriedTabs | Refusal {
	const moment = momentAt(placed, { window: at.window, tabWindows: tabFactsOf(at.screen).tabWindows }, apps);
	return carriedOf(moment, tabPagesOf(moment.tabs, at.screen.pages), entry);
}

export function arrivalPlan(carried: CarriedTabs, from: string): MomentPlan<ArrivedTabs> {
	return (moment) => {
		const renamed = idsMintedFor(moment.minted, carried);
		const idOf = (id: string): string => renamed.get(id) ?? id;
		const entryOf = (entry: ListEntry): ListEntry => ({ ...entry, id: idOf(entry.id) });
		const arrived: ArrivedTabs = {
			entry: entryOf(carried.entry),
			tabIds: carried.tabs.map((tab) => idOf(tab.id)),
			groupIds: carried.groups.map((group) => idOf(group.id)),
		};
		const pageLists = Object.entries(carried.pageLists).map(([list, entries]) => [idOf(list), entries.map(entryOf)]);
		const next: HostTabsMoment = {
			...moment,
			tabs: [...moment.tabs, ...carried.tabs.map((tab) => ({ ...tab, id: idOf(tab.id) }))],
			groups: [
				...moment.groups,
				...carried.groups.map((group) => ({ ...group, id: idOf(group.id), entries: group.entries.map(entryOf) })),
			],
			lists: {
				...withEntryBefore(moment.lists, WORKSPACE_LIST, arrived.entry, null),
				...Object.fromEntries(pageLists),
			},
			minted: moment.minted + renamed.size,
		};
		const reason = `${carried.entry.kind} ${carried.entry.id} of workspace ${from} → ${arrived.entry.id} here, with ${arrived.tabIds.length} tabs and ${arrived.groupIds.length} groups (moved in)`;
		return movedPlan(moment, { moment: next, reason }, arrived);
	};
}

export function departurePlan(carried: CarriedTabs, to: string): ShowingPlan {
	return (showing, facts) => {
		const now = carriedOf(showing.moment, new Map(), carried.entry);

		if (isRefusal(now)) {
			return now;
		}

		if (!isSameCarry(now, carried)) {
			return refusal(CHANGED_MEANWHILE.replace("{kind}", carried.entry.kind));
		}

		const reason = `${carried.entry.kind} ${carried.entry.id} with ${carried.tabs.length} tabs → workspace ${to} (moved out)`;
		const closed = withTabsClosed(showing, facts, { ids: carried.tabs.map((tab) => tab.id), reason });
		const layout = carried.groups.reduce<TabLayout>((kept, { id }) => withoutGroup(kept, id, []), closed.moment);
		return {
			...closed,
			moment: {
				...closed.moment,
				...layout,
				closed: showing.moment.closed,
			},
		};
	};
}

export function withdrawalPlan(arrived: ArrivedTabs, reason: string): MomentPlan<null> {
	return (moment) => {
		const leaving = new Set(arrived.tabIds);
		const layout = arrived.groupIds.reduce<TabLayout>(
			(kept, id) => withoutGroup(kept, id, []),
			withoutEntry(moment, arrived.entry),
		);
		const next: HostTabsMoment = {
			...moment,
			...layout,
			lists: Object.fromEntries(Object.entries(layout.lists).filter(([list]) => !leaving.has(list))),
			tabs: moment.tabs.filter((tab) => !leaving.has(tab.id)),
		};
		return movedPlan(moment, { moment: next, reason }, null);
	};
}

function carriedOf(moment: HostTabsMoment, pages: ReadonlyMap<string, TabPage>, entry: ListEntry): CarriedTabs | Refusal {
	const root = rootOf(moment, entry);

	if (isRefusal(root)) {
		return root;
	}

	const tabs = withSubPagesOf(moment, root.tabIds).flatMap((id) => heldTabOf(moment, id) ?? []);
	const refused = tabs.map((tab) => refuseCarrying(moment, tab)).find((said) => said !== null) ?? null;

	if (refused !== null) {
		return refusal(refused);
	}

	return {
		entry,
		tabs: tabs.map((tab) => carriedTabOf(tab, pages.get(tab.id))),
		groups: root.groups,
		pageLists: Object.fromEntries(tabs.flatMap(({ id }) => pageListOf(moment, id))),
	};
}

function rootOf(moment: HostTabsMoment, entry: ListEntry): CarriedRoot | Refusal {
	if (entry.kind === "tab") {
		const tab = heldTabOf(moment, entry.id);
		return tab === undefined
			? refusal(NO_TAB.replace("{id}", entry.id))
			: {
					tabIds: [tab.id],
					groups: [],
				};
	}

	const group = findGroup(moment.groups, entry.id);

	if (group === undefined) {
		return refusal(NO_GROUP.replace("{id}", entry.id));
	}

	return {
		tabIds: tabIdsOfGroup(moment.groups, group),
		groups: [group, ...groupsUnder(moment.groups, group.entries, new Set([group.id]))],
	};
}

function refuseCarrying(moment: HostTabsMoment, tab: HostTab): string | null {
	const title = tab.label ?? tab.title ?? tab.id;

	if (isChatTab(moment.apps, tab)) {
		return CHAT_STAYS.replace("{title}", title);
	}

	const holder = holderLabelOf(moment.heldElsewhere, tab.id);
	return holder === null ? null : HELD_ELSEWHERE.replace("{title}", title).replace("{window}", holder);
}

function carriedTabOf(tab: HostTab, page: TabPage | undefined): HostTab {
	return {
		...tab,
		pageId: null,
		lastAddress: page === undefined || page.address === "" ? tab.lastAddress : page.address,
		mark: "none",
	};
}

function pageListOf(moment: HostTabsMoment, tabId: string): readonly (readonly [string, readonly ListEntry[]])[] {
	const list = moment.lists[tabId];
	return list === undefined ? [] : [[tabId, list]];
}

function idsMintedFor(minted: number, { tabs, groups }: CarriedTabs): ReadonlyMap<string, string> {
	return new Map([
		...tabs.map(({ id }, at) => [id, `tab-${minted + at + 1}`] as const),
		...groups.map(({ id }, at) => [id, `group-${minted + tabs.length + at + 1}`] as const),
	]);
}

function isSameCarry(now: CarriedTabs, carried: CarriedTabs): boolean {
	return idsSaid(now) === idsSaid(carried);
}

function idsSaid({ tabs, groups }: CarriedTabs): string {
	return [...tabs.map(({ id }) => id), ...groups.map(({ id }) => id)].sort().join(" ");
}
