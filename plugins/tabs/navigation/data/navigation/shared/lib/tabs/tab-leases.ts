import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import type { KeptSplit } from "../../schema/splits.schema.js";
import type { PlacedTabs, WindowView } from "../../schema/tabs.schema.js";

export type Holders = ReadonlyMap<string, string>;

export interface ScreenHolds {
	readonly window: string;
	readonly tabWindows: ReadonlyMap<string, string>;
}

type LeaseFacts = Pick<PlacedTabs, "windows" | "views" | "tabs" | "splits">;

export const NO_HOLDERS: ReadonlyMap<string, string> = new Map<string, string>();

export function holdersOf(placed: LeaseFacts): Holders {
	const joined = [...placed.windows].sort((one, other) => one.openedAt - other.openedAt).map(({ label }) => label);
	const holders = new Map<string, string>();

	for (const label of joined) {
		for (const [window, view] of Object.entries(placed.views)) {
			if (labelOfPlacesWindow(window) !== label) {
				continue;
			}

			for (const id of displayedIdsOf(placed, view)) {
				if (!holders.has(id)) {
					holders.set(id, window);
				}
			}
		}
	}

	return holders;
}

export function heldElsewhereOf(placed: LeaseFacts, window: string | null): Holders {
	const holders = holdersOf(placed);

	if (window === null) {
		return holders;
	}

	return othersOf(holders, window);
}

export function heldAt(placed: LeaseFacts, { window, tabWindows }: ScreenHolds): Holders {
	const held = heldElsewhereOf(placed, window);
	const own = labelOfPlacesWindow(window);
	const joined = new Set(placed.windows.map(({ label }) => label));
	const suffix = window.slice(own.length);
	const onScreens = [...tabWindows].filter(([id, label]) => !held.has(id) && label !== own && joined.has(label));

	if (onScreens.length === 0) {
		return held;
	}

	return new Map([...held, ...onScreens.map(([id, label]) => [id, `${label}${suffix}`] as const)]);
}

interface Displayable {
	readonly tabs: readonly { readonly id: string; readonly app: string }[];
	readonly splits: readonly KeptSplit[];
}

export function displayedIdsOf(placed: Displayable, view: WindowView): readonly string[] {
	const split = view.shownSplitId === null ? undefined : placed.splits.find(({ id }) => id === view.shownSplitId);
	const shown = placed.tabs.find(({ id }) => id === view.shownId);
	const shownIds = shown !== undefined && shown.app === view.view ? [shown.id] : [];
	return [...(split?.memberIds ?? []), ...shownIds];
}

export function viewsOfOthersKept(was: Displayable, next: LeaseFacts, actor: string | null): PlacedTabs["views"] {
	return Object.fromEntries(
		Object.entries(next.views).map(([window, view]) => {
			const isGained = window !== actor && isShownDisplayed(next, view) && !isShownDisplayed(was, view);
			return [window, isGained ? { ...view, shownId: null } : view];
		}),
	);
}

export function holderLabelOf(holders: Holders, id: string): string | null {
	const holder = holders.get(id);
	return holder === undefined ? null : labelOfPlacesWindow(holder);
}

export function viewsSettled(placed: LeaseFacts): PlacedTabs["views"] {
	const tabIds = new Set(placed.tabs.map(({ id }) => id));
	const splits = new Map(placed.splits.map((split) => [split.id, split]));
	const holders = holdersOf(placed);
	const joined = new Set(placed.windows.map(({ label }) => label));
	return Object.fromEntries(
		Object.entries(placed.views).map(([window, view]) => {
			const foreign = joined.has(labelOfPlacesWindow(window)) ? othersOf(holders, window) : NO_HOLDERS;
			return [window, viewSettled(view, { tabIds, splits, foreign })];
		}),
	);
}

interface ViewFacts {
	readonly tabIds: ReadonlySet<string>;
	readonly splits: ReadonlyMap<string, KeptSplit>;
	readonly foreign: Holders;
}

function othersOf(holders: Holders, window: string): Holders {
	const own = labelOfPlacesWindow(window);
	return new Map([...holders].filter(([, holder]) => labelOfPlacesWindow(holder) !== own));
}

function viewSettled(view: WindowView, { tabIds, splits, foreign }: ViewFacts): WindowView {
	const split = view.shownSplitId === null ? undefined : splits.get(view.shownSplitId);
	const isShownKept = view.shownId !== null && tabIds.has(view.shownId) && !foreign.has(view.shownId);
	const isSelectedKept = view.selectedId !== null && tabIds.has(view.selectedId);
	const isSplitKept = split !== undefined && !split.memberIds.some((id) => foreign.has(id));
	const shownId = isShownKept ? view.shownId : null;
	const selectedId = isSelectedKept ? view.selectedId : null;
	const shownSplitId = isSplitKept ? view.shownSplitId : null;

	if (shownId === view.shownId && selectedId === view.selectedId && shownSplitId === view.shownSplitId) {
		return view;
	}

	return {
		...view,
		shownId,
		selectedId,
		shownSplitId,
	};
}

function isShownDisplayed(placed: Displayable, view: WindowView): boolean {
	return placed.tabs.some(({ id, app }) => id === view.shownId && app === view.view);
}
