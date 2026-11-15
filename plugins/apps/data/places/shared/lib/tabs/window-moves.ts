import { MAIN_STUDIO_WINDOW, labelOfPlacesWindow } from "@widgetarium/behaviors";
import { PlacedTabsSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import type { TabsAsk } from "../../schema/screen.schema.js";
import type { MovePlacedTabs } from "../settling/settling.js";
import { splitWithout, splitsPruned } from "../splits/split-members.js";
import type { PlacedApps } from "./app-abilities.js";
import { momentOfWindow, placedWith } from "./kept-tabs.js";
import { closeTabs } from "./tab-closing.js";
import {
	PINNED_LIST,
	WORKSPACE_LIST,
	flatTabIdsOf,
	locationOf,
	windowListOf,
	windowOfList,
	withTabAt,
	withoutTab,
} from "./tab-lists.js";
import { elsewhereOf, essentialWindowOf } from "./window-share.js";

export interface WindowsMove {
	readonly placed: PlacedTabs;
	readonly reasons: readonly string[];
}

export function adoptedBy(placed: PlacedTabs, { window, screen }: TabsAsk): WindowsMove | null {
	const elsewhere = elsewhereOf(placed, window);
	const shownElsewhere = new Set(screen.elsewhere.flatMap(({ tabIds }) => tabIds));
	const shownHere = new Set([
		...screen.tabPanes.map(({ tabId }) => tabId),
		...screen.chatGroups.map(({ chatId }) => chatId),
	]);
	const ids = [...shownHere].filter(
		(id) => elsewhere.tabIds.has(id) && !shownElsewhere.has(id) && windowListHolding(placed, id) !== null,
	);

	if (ids.length === 0) {
		return null;
	}

	return ids.reduce<WindowsMove>((moved, id) => adopted(moved, window, id), { placed, reasons: [] });
}

export function windowsForgotten(isGone: (window: string) => boolean, apps: PlacedApps): MovePlacedTabs<null> {
	return (placed) => {
		const gone = knownWindowsOf(placed).filter((window) => {
			const label = labelOfPlacesWindow(window);
			return label !== MAIN_STUDIO_WINDOW && isGone(label);
		});

		if (gone.length === 0) {
			return { next: null, reason: "no closed window holds tabs", answer: null };
		}

		const moved = gone.reduce<WindowsMove>((was, window) => forgotten(was, window, apps), { placed, reasons: [] });
		return { next: moved.placed, reason: moved.reasons.join("; "), answer: null };
	};
}

export function essentialCopiesClosed(essentialId: string, apps: PlacedApps): MovePlacedTabs<null> {
	return (placed) => {
		const windows = [
			...new Set(
				placed.tabs
					.filter((tab) => tab.essentialId === essentialId)
					.flatMap((tab) => {
						const window = essentialWindowOf(tab);
						return window === null ? [] : [window];
					}),
			),
		];

		if (windows.length === 0) {
			return { next: null, reason: `no window holds a copy of essential ${essentialId}`, answer: null };
		}

		const moved = windows.reduce<WindowsMove>((was, window) => copyClosed(was, { window, essentialId }, apps), {
			placed,
			reasons: [],
		});
		return { next: moved.placed, reason: moved.reasons.join("; "), answer: null };
	};
}

interface EssentialCopy {
	readonly window: string;
	readonly essentialId: string;
}

function copyClosed({ placed, reasons }: WindowsMove, { window, essentialId }: EssentialCopy, apps: PlacedApps): WindowsMove {
	const moment = momentOfWindow(placed, window, apps);
	const ids = moment.tabs.filter((tab) => tab.essentialId === essentialId).map((tab) => tab.id);
	const closed = closeTabs(moment, new Map(), { ids, reason: `essential ${essentialId} removed` });
	return {
		placed: placedWith(placed, window, splitsPruned(closed.moment)),
		reasons: [...reasons, `window ${window} essential ${essentialId} copy ${ids.join(", ")} → closed (the essential was removed)`],
	};
}

function windowListHolding(placed: PlacedTabs, tabId: string): string | null {
	const list = locationOf(placed, tabId)?.chatId ?? null;
	return list === null || windowOfList(list) === null ? null : list;
}

function adopted({ placed, reasons }: WindowsMove, window: string, id: string): WindowsMove {
	const to = windowListOf(window, WORKSPACE_LIST);
	const layout = withTabAt(withoutTab(placed, id), id, { chatId: to, groupId: null, before: null });
	return {
		placed: PlacedTabsSchema.parse({
			...placed,
			...layout,
			splits: placed.splits.flatMap((split) => {
				const kept = splitWithout(split, (member) => member === id);
				return kept === null ? [] : [kept];
			}),
		}),
		reasons: [...reasons, `${id} ${windowListHolding(placed, id) ?? "nowhere"} → ${to} (shown in a pane of ${window})`],
	};
}

function knownWindowsOf(placed: PlacedTabs): readonly string[] {
	const listed = Object.keys(placed.lists).flatMap((listId) => {
		const window = windowOfList(listId);
		return window === null ? [] : [window];
	});
	return [...new Set([...Object.keys(placed.views), ...listed])];
}

function forgotten({ placed, reasons }: WindowsMove, window: string, apps: PlacedApps): WindowsMove {
	const moment = momentOfWindow(placed, window, apps);
	const ids = [
		...flatTabIdsOf(moment, PINNED_LIST),
		...flatTabIdsOf(moment, WORKSPACE_LIST),
		...moment.tabs.filter((tab) => tab.essentialId !== null).map((tab) => tab.id),
	];
	const closed = closeTabs(moment, new Map(), { ids, reason: `close window ${window}` });
	return {
		placed: withoutWindow(placedWith(placed, window, splitsPruned(closed.moment)), window),
		reasons: [...reasons, `window ${window} ${ids.length} tabs → closed history, its lists → none (the window closed)`],
	};
}

function withoutWindow(placed: PlacedTabs, window: string): PlacedTabs {
	const own = [windowListOf(window, WORKSPACE_LIST), windowListOf(window, PINNED_LIST)];
	const groupIds = new Set(
		own.flatMap((listId) =>
			(placed.lists[listId] ?? []).filter((entry) => entry.kind === "group").map((entry) => entry.id),
		),
	);
	const { [window]: _view, ...views } = placed.views;
	return {
		...placed,
		lists: Object.fromEntries(Object.entries(placed.lists).filter(([listId]) => !own.includes(listId))),
		groups: placed.groups.filter((group) => !groupIds.has(group.id)),
		views,
	};
}
