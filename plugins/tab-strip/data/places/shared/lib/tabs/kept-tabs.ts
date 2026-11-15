import { PlacedTabsSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs, WindowTabs, WindowView } from "../../schema/tabs.schema.js";
import { emptyMoment, momentSaid } from "./host-tabs.js";
import type { HostTabsMoment } from "./host-tabs.js";
import { placedAppsOf } from "./app-abilities.js";
import type { PlacedApps } from "./app-abilities.js";
import { elsewhereOf, keptElsewhere, mergedById, shownListsOf, storedListsOf } from "./window-share.js";

const NO_VIEW: WindowView = {
	shownId: null,
	selectedId: null,
	view: "app",
	shownSplitId: null,
	sessionId: null,
};

export function emptyPlacedTabs(): PlacedTabs {
	const {
		shownId: _shown,
		selectedId: _selected,
		view: _view,
		shownSplitId: _split,
		apps: _apps,
		...shared
	} = emptyMoment(placedAppsOf([]));
	return PlacedTabsSchema.parse({
		...shared,
		views: {},
	});
}

export function momentOfWindow(placed: PlacedTabs, window: string | null, apps: PlacedApps): HostTabsMoment {
	const { views, ...shared } = placed;
	const elsewhere = elsewhereOf(placed, window);
	return {
		...shared,
		...((window === null ? undefined : views[window]) ?? NO_VIEW),
		tabs: shared.tabs.filter((tab) => !elsewhere.tabIds.has(tab.id)),
		lists: shownListsOf(shared.lists, elsewhere, window),
		groups: shared.groups.filter((group) => !elsewhere.groupIds.has(group.id)),
		splits: shared.splits.filter((split) => !elsewhere.splitIds.has(split.id)),
		apps,
	};
}

export function windowTabsOf(moment: HostTabsMoment): WindowTabs {
	return {
		tabs: [...moment.tabs],
		lists: Object.fromEntries(Object.entries(moment.lists).map(([list, entries]) => [list, [...entries]])),
		groups: moment.groups.map((group) => ({ ...group, tabIds: [...group.tabIds] })),
		shownId: moment.shownId,
		minted: moment.minted,
		closed: [...moment.closed],
	};
}

export function placedWith(placed: PlacedTabs, window: string | null, moment: HostTabsMoment): PlacedTabs {
	const { shownId, ...shared } = windowTabsOf(moment);
	const { splits, mintedSplits, shownSplitId, selectedId, view } = moment;
	const elsewhere = elsewhereOf(placed, window);
	return PlacedTabsSchema.parse({
		...shared,
		tabs: mergedById(
			placed.tabs,
			elsewhere.tabIds,
			shared.tabs,
		),
		lists: { ...keptElsewhere(placed.lists, elsewhere), ...storedListsOf(shared.lists, window) },
		groups: mergedById(placed.groups, elsewhere.groupIds, shared.groups),
		splits: mergedById(placed.splits, elsewhere.splitIds, splits),
		mintedSplits,
		askedLinks: placed.askedLinks,
		mintedLinks: placed.mintedLinks,
		sessions: placed.sessions,
		views:
			window === null
				? placed.views
				: {
						...placed.views,
						[window]: {
							shownId,
							selectedId,
							view,
							shownSplitId,
							sessionId: placed.views[window]?.sessionId ?? crypto.randomUUID(),
						},
					},
	});
}

export function tabsTransitionSaid(was: HostTabsMoment, next: HostTabsMoment, reason: string): string {
	return `tabs ${momentSaid(was)} → ${momentSaid(next)} (${reason})`;
}
