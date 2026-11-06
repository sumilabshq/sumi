import { PlacedTabsSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs, WindowTabs } from "../../schema/tabs.schema.js";
import { emptyMoment, momentSaid } from "./host-tabs.js";
import type { HostTabsMoment } from "./host-tabs.js";

const NO_VIEW = {
	shownId: null,
	lastShown: {},
	shownSplitId: null,
};

export function emptyPlacedTabs(): PlacedTabs {
	const { shownId: _shown, lastShown: _last, shownSplitId: _split, ...shared } = emptyMoment();
	return PlacedTabsSchema.parse({
		...shared,
		views: {},
	});
}

export function momentOfWindow(placed: PlacedTabs, window: string | null): HostTabsMoment {
	const { views, ...shared } = placed;
	return {
		...shared,
		...((window === null ? undefined : views[window]) ?? NO_VIEW),
	};
}

export function windowTabsOf(moment: HostTabsMoment): WindowTabs {
	return {
		tabs: [...moment.tabs],
		lists: Object.fromEntries(Object.entries(moment.lists).map(([list, entries]) => [list, [...entries]])),
		groups: moment.groups.map((group) => ({ ...group, tabIds: [...group.tabIds] })),
		shownId: moment.shownId,
		lastShown: { ...moment.lastShown },
		minted: moment.minted,
		closed: [...moment.closed],
	};
}

export function placedWith(placed: PlacedTabs, window: string | null, moment: HostTabsMoment): PlacedTabs {
	const { shownId, lastShown, ...shared } = windowTabsOf(moment);
	const { splits, mintedSplits, shownSplitId } = moment;
	return PlacedTabsSchema.parse({
		...shared,
		splits,
		mintedSplits,
		askedLinks: placed.askedLinks,
		mintedLinks: placed.mintedLinks,
		pendingPresses: placed.pendingPresses,
		mintedPresses: placed.mintedPresses,
		views: window === null ? placed.views : { ...placed.views, [window]: { shownId, lastShown, shownSplitId } },
	});
}

export function tabsTransitionSaid(was: HostTabsMoment, next: HostTabsMoment, reason: string): string {
	return `tabs ${momentSaid(was)} → ${momentSaid(next)} (${reason})`;
}
