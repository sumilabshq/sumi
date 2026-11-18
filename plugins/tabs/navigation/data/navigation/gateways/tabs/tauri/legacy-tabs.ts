import { labelOfPlacesWindow, placesWindowOf } from "@widgetarium/behaviors";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import type { ListEntry, PlacedTabs, WindowSession } from "../../../shared/schema/tabs.schema.js";
import type { KeptSplit } from "../../../shared/schema/splits.schema.js";
import { WORKSPACE_LIST, flatTabIdsOf, groupsUnder, isSectionList, windowOfList } from "../../../shared/lib/tabs/tab-lists.js";
import type { TabLayout } from "../../../shared/lib/tabs/tab-lists.js";
import { emptyPlacedTabs } from "../../../shared/lib/tabs/kept-tabs.js";

export interface ReshapedTabs {
	readonly placed: PlacedTabs;
	readonly reason: string;
}

type TabsPart = Pick<PlacedTabs, "tabs" | "lists" | "groups" | "splits">;

interface Gathered {
	readonly entries: readonly ListEntry[];
	readonly lists: Readonly<Record<string, readonly ListEntry[]>>;
	readonly tabs: PlacedTabs["tabs"];
	readonly groups: PlacedTabs["groups"];
	readonly splits: readonly KeptSplit[];
}

const NOTHING_GATHERED: Gathered = {
	entries: [],
	lists: {},
	tabs: [],
	groups: [],
	splits: [],
};

export function windowListsFolded(placed: PlacedTabs): ReshapedTabs | null {
	const windowLists = Object.keys(placed.lists).filter((listId) => windowOfList(listId) !== null);

	if (windowLists.length === 0) {
		return null;
	}

	const folded = gatheredFrom(NOTHING_GATHERED, {
		...placed,
		lists: { [WORKSPACE_LIST]: placed.lists[WORKSPACE_LIST] ?? [], ...placed.lists },
	});
	return {
		placed: PlacedTabsSchema.parse({
			...placed,
			lists: { ...folded.lists, [WORKSPACE_LIST]: folded.entries },
		}),
		reason: `tabs lists ${windowLists.join(", ")} → ${WORKSPACE_LIST} (a tab belongs to the workspace)`,
	};
}

export function workspaceTabsOf(global: PlacedTabs, workspaceId: string): ReshapedTabs {
	const isOwn = (window: string): boolean => window === placesWindowOf(labelOfPlacesWindow(window), workspaceId);
	const ownLists = Object.fromEntries(
		Object.entries(global.lists).filter(([listId]) => {
			const window = windowOfList(listId);
			return window === null || isOwn(window);
		}),
	);
	const live = gatheredFrom(NOTHING_GATHERED, { ...global, lists: ownLists });
	const liveLabels = new Set(
		Object.keys(ownLists).flatMap((listId) => {
			const window = windowOfList(listId);
			return window === null || (ownLists[listId] ?? []).length === 0 ? [] : [labelOfPlacesWindow(window)];
		}),
	);
	const sessions = global.sessions.filter((session) => isOwn(session.window));
	const restored = newestPerLabel(sessions).filter((session) => !liveLabels.has(labelOfPlacesWindow(session.window)));
	const gathered = restored.reduce<Gathered>((was, session) => gatheredFrom(was, session), live);
	const restoredIds = new Set(restored.map(({ id }) => id));
	const keptIds = new Set(gathered.tabs.map(({ id }) => id));
	return {
		placed: PlacedTabsSchema.parse({
			...emptyPlacedTabs(),
			tabs: gathered.tabs,
			lists: { ...gathered.lists, [WORKSPACE_LIST]: gathered.entries },
			groups: gathered.groups,
			splits: gathered.splits,
			views: Object.fromEntries(Object.entries(global.views).filter(([window]) => isOwn(window))),
			sessions: sessions.filter(({ id }) => !restoredIds.has(id)),
			minted: global.minted,
			mintedSplits: global.mintedSplits,
			closed: global.closed.flatMap((closed) => closedKept(closed, { isOwn, keptIds })),
			windows: [],
		}),
		reason: `places global → workspace ${workspaceId}: ${gathered.tabs.length} tabs (${restored.length} closed window sessions brought back)`,
	};
}

interface ClosedFacts {
	readonly isOwn: (window: string) => boolean;
	readonly keptIds: ReadonlySet<string>;
}

function closedKept(closed: PlacedTabs["closed"][number], { isOwn, keptIds }: ClosedFacts): PlacedTabs["closed"] {
	if (closed.chatId === null || keptIds.has(closed.tab.id)) {
		return [];
	}

	const window = windowOfList(closed.chatId);

	if (window !== null) {
		return isOwn(window) ? [{ ...closed, chatId: WORKSPACE_LIST }] : [];
	}

	return isSectionList(closed.chatId) || keptIds.has(closed.chatId) ? [closed] : [];
}

function newestPerLabel(sessions: readonly WindowSession[]): readonly WindowSession[] {
	const newest = new Map<string, WindowSession>();

	for (const session of sessions) {
		const label = labelOfPlacesWindow(session.window);
		const known = newest.get(label);

		if (known === undefined || known.closedAt < session.closedAt) {
			newest.set(label, session);
		}
	}

	return [...newest.values()];
}

function gatheredFrom(was: Gathered, part: TabsPart): Gathered {
	const roots = Object.keys(part.lists).filter(isSectionList);
	const held = listsHeldUnder(part, roots);
	const known = new Set([...was.tabs.map(({ id }) => id), ...was.groups.map(({ id }) => id)]);
	const entries = roots.flatMap((listId) => part.lists[listId] ?? []).filter((entry) => !known.has(entry.id));
	const tabIds = new Set([...held].flatMap((listId) => flatTabIdsOf(part, listId)).filter((id) => !known.has(id)));
	const groupIds = new Set([...held].flatMap((listId) => groupsUnder(part.groups, part.lists[listId] ?? []).map(({ id }) => id)));
	const nested = [...held].filter((listId) => !roots.includes(listId) && was.lists[listId] === undefined);
	return {
		entries: [...was.entries, ...uniqueEntries(entries)],
		lists: { ...was.lists, ...Object.fromEntries(nested.map((listId) => [listId, part.lists[listId] ?? []])) },
		tabs: [...was.tabs, ...part.tabs.filter(({ id }) => tabIds.has(id))],
		groups: [...was.groups, ...part.groups.filter(({ id }) => groupIds.has(id) && !known.has(id))],
		splits: [
			...was.splits,
			...part.splits.filter(
				(split) => split.memberIds.every((id) => tabIds.has(id)) && !was.splits.some(({ id }) => id === split.id),
			),
		],
	};
}

function uniqueEntries(entries: readonly ListEntry[]): readonly ListEntry[] {
	return entries.filter((entry, at) => entries.findIndex(({ id }) => id === entry.id) === at);
}

function listsHeldUnder(layout: TabLayout, listIds: readonly string[]): ReadonlySet<string> {
	const deeper = [
		...new Set(
			listIds
				.flatMap((listId) => flatTabIdsOf(layout, listId))
				.filter((id) => layout.lists[id] !== undefined && !listIds.includes(id)),
		),
	];
	return deeper.length === 0 ? new Set(listIds) : listsHeldUnder(layout, [...listIds, ...deeper]);
}
