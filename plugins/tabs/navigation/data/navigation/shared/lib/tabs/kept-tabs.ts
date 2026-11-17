import { PlacedTabsSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs, WindowTabs, WindowView } from "../../schema/tabs.schema.js";
import { emptyMoment, momentSaid } from "./host-tabs.js";
import type { HostTabsMoment } from "./host-tabs.js";
import { placedAppsOf } from "./app-abilities.js";
import type { PlacedApps } from "./app-abilities.js";
import { heldAt, heldElsewhereOf, viewsOfOthersKept, viewsSettled } from "./tab-leases.js";
import type { Holders, ScreenHolds } from "./tab-leases.js";

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
		heldElsewhere: _held,
		...shared
	} = emptyMoment(placedAppsOf([]));
	return PlacedTabsSchema.parse({
		...shared,
		views: {},
		windows: [],
	});
}

export function momentOfWindow(placed: PlacedTabs, window: string | null, apps: PlacedApps): HostTabsMoment {
	return momentHeld(placed, { window, apps, heldElsewhere: heldElsewhereOf(placed, window) });
}

export function momentAt(placed: PlacedTabs, at: ScreenHolds, apps: PlacedApps): HostTabsMoment {
	return momentHeld(placed, { window: at.window, apps, heldElsewhere: heldAt(placed, at) });
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
	const next = PlacedTabsSchema.parse({
		...shared,
		splits,
		mintedSplits,
		askedLinks: placed.askedLinks,
		mintedLinks: placed.mintedLinks,
		sessions: placed.sessions,
		windows: placed.windows,
		views:
			window === null
				? placed.views
				: {
						...placed.views,
						[window]: {
							...placed.views[window],
							shownId,
							selectedId,
							view,
							shownSplitId,
							sessionId: placed.views[window]?.sessionId ?? crypto.randomUUID(),
						},
					},
	});
	return {
		...next,
		views: viewsSettled({ ...next, views: viewsOfOthersKept(placed, next, window) }),
	};
}

export function tabsTransitionSaid(was: HostTabsMoment, next: HostTabsMoment, reason: string): string {
	return `tabs ${momentSaid(was)} → ${momentSaid(next)} (${reason})`;
}

interface HeldWindow {
	readonly window: string | null;
	readonly apps: PlacedApps;
	readonly heldElsewhere: Holders;
}

function momentHeld(placed: PlacedTabs, { window, apps, heldElsewhere }: HeldWindow): HostTabsMoment {
	const { views, windows: _joined, ...shared } = placed;
	const kept = (window === null ? undefined : views[window]) ?? NO_VIEW;
	return {
		...shared,
		...viewFreeOf(placed, kept, heldElsewhere),
		apps,
		heldElsewhere,
	};
}

function viewFreeOf(placed: PlacedTabs, view: WindowView, heldElsewhere: Holders): WindowView {
	const split = placed.splits.find(({ id }) => id === view.shownSplitId);
	const isShownHeld = view.shownId !== null && heldElsewhere.has(view.shownId);
	const isSplitHeld = split !== undefined && split.memberIds.some((id) => heldElsewhere.has(id));

	if (!isShownHeld && !isSplitHeld) {
		return view;
	}

	return {
		...view,
		shownId: isShownHeld ? null : view.shownId,
		shownSplitId: isSplitHeld ? null : view.shownSplitId,
	};
}
