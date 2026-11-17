import type { KeptSplit } from "../../schema/splits.schema.js";
import type { HostTabsMoment } from "./host-tabs-moment.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { displayedIdsOf, heldElsewhereOf, holderLabelOf, holdersOf } from "./tab-leases.js";

const CLOSED_ELSEWHERE = 'the tab "{id}" is open in window {window}: only that window closes it';
const SHOWN_ELSEWHERE = 'the tab "{id}" is open in window {window}: one tab shows in one window';
const CHANGED_ELSEWHERE = 'the tab "{id}" is open in window {window}: only that window changes it';
const SPLIT_ELSEWHERE = 'the split "{id}" is shown in window {window}: only that window changes it';

export function leaseBreaksOf(was: HostTabsMoment, next: HostTabsMoment): readonly string[] {
	const held = was.heldElsewhere;

	if (held.size === 0) {
		return [];
	}

	const kept = new Set(next.tabs.map(({ id }) => id));
	const before = new Set(displayedOf(was));
	const closed = was.tabs
		.filter(({ id }) => held.has(id) && !kept.has(id))
		.map(({ id }) => said(CLOSED_ELSEWHERE, id, holderLabelOf(held, id)));
	const shown = displayedOf(next)
		.filter((id) => held.has(id) && !before.has(id))
		.map((id) => said(SHOWN_ELSEWHERE, id, holderLabelOf(held, id)));
	const splits = was.splits
		.filter((split) => split.memberIds.some((id) => held.has(id)) && !isKeptAmong(next.splits, split))
		.map((split) =>
			said(SPLIT_ELSEWHERE, split.id, holderLabelOf(held, split.memberIds.find((id) => held.has(id)) ?? "")),
		);
	return [...closed, ...shown, ...splits];
}

export function holdBreaksOf(was: PlacedTabs, next: PlacedTabs, actor: string | null): readonly string[] {
	const held = heldElsewhereOf(was, actor);

	if (held.size === 0) {
		return [];
	}

	const holders = holdersOf(next);
	const changed = [...held]
		.filter(([id, holder]) => holders.get(id) !== holder)
		.map(([id]) => said(CHANGED_ELSEWHERE, id, holderLabelOf(held, id)));
	const isHeld = (split: KeptSplit): boolean => split.memberIds.some((id) => held.has(id));
	const splits = [
		...was.splits.filter((split) => isHeld(split) && !isKeptAmong(next.splits, split)),
		...next.splits.filter((split) => isHeld(split) && !isKeptAmong(was.splits, split)),
	].map((split) =>
		said(SPLIT_ELSEWHERE, split.id, holderLabelOf(held, split.memberIds.find((id) => held.has(id)) ?? "")),
	);
	return [...changed, ...splits];
}

function displayedOf(moment: HostTabsMoment): readonly string[] {
	return displayedIdsOf(moment, {
		shownId: moment.shownId,
		selectedId: moment.selectedId,
		view: moment.view,
		shownSplitId: moment.shownSplitId,
		sessionId: null,
	});
}

function isKeptAmong(splits: readonly KeptSplit[], split: KeptSplit): boolean {
	const now = splits.find(({ id }) => id === split.id);
	return (
		now !== undefined && JSON.stringify({ ...now, focusedId: null }) === JSON.stringify({ ...split, focusedId: null })
	);
}

function said(template: string, id: string, window: string | null): string {
	return template.replace("{id}", id).replace("{window}", window ?? "another window");
}
