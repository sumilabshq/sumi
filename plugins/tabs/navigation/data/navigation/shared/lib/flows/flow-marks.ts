import type { InboxUndo } from "../../schema/flows.schema.js";
import type { PlacedTabs, TabMark } from "../../schema/tabs.schema.js";

export type MarkChange = InboxUndo["marks"][number];

export interface MarksMoved {
	readonly placed: PlacedTabs;
	readonly changes: readonly MarkChange[];
}

export const READ_ON_OPEN: readonly TabMark[] = ["unread", "failed"];

export function marksCleared(placed: PlacedTabs, tabIds: ReadonlySet<string>, marks: readonly TabMark[]): MarksMoved {
	const cleared = placed.tabs
		.filter((tab) => tabIds.has(tab.id) && marks.includes(tab.mark))
		.map((tab) => ({ tabId: tab.id, mark: tab.mark }));

	if (cleared.length === 0) {
		return { placed, changes: cleared };
	}

	const changed = new Set(cleared.map(({ tabId }) => tabId));
	return {
		placed: {
			...placed,
			tabs: placed.tabs.map((tab) => (changed.has(tab.id) ? { ...tab, mark: "none" } : tab)),
		},
		changes: cleared,
	};
}

export function marksRestored(placed: PlacedTabs, undo: InboxUndo): MarksMoved {
	const wanted = new Map(undo.marks.map(({ tabId, mark }) => [tabId, mark]));
	const restored = placed.tabs
		.filter((tab) => tab.mark === "none" && wanted.has(tab.id))
		.map((tab) => ({ tabId: tab.id, mark: wanted.get(tab.id) ?? "none" }));
	const next = new Map(restored.map(({ tabId, mark }) => [tabId, mark]));
	return {
		placed: {
			...placed,
			tabs: placed.tabs.map((tab) => (next.has(tab.id) ? { ...tab, mark: next.get(tab.id) ?? tab.mark } : tab)),
		},
		changes: restored,
	};
}

export function marksSaid(changes: readonly MarkChange[]): string {
	return changes.length === 0 ? "no marks" : changes.map(({ tabId, mark }) => `${tabId} ${mark} → none`).join(", ");
}
