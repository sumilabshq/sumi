import type { KeptSplit, SplitSide } from "../../schema/splits.schema.js";
import { SPLIT_MOST_MEMBERS } from "../../schema/splits.schema.js";
import type { HostTabsMoment, MovedTabs } from "../tabs/host-tabs.js";
import { heldTabOf, isPageTab, markShown, placeTab } from "../tabs/host-tabs.js";
import { WORKSPACE_LIST, isSectionList, locationOf } from "../tabs/tab-lists.js";
import { blockListOf, firstListedMember, isTopLevel, shownSplitOf, splitOfTab, splitWithout } from "./split-members.js";
import { branchIdsOf, isEdgeOf, leafOf, withBranchShare, withLeafPlaced, withoutLeaf } from "./split-tree.js";
import type { BranchShare } from "./split-tree.js";

export interface ViewPlacing {
	readonly tabId: string;
	readonly targetTabId: string | null;
	readonly side: SplitSide;
}

interface Leaving {
	readonly split: KeptSplit;
	readonly left: KeptSplit | null;
	readonly tabId: string;
}

interface PlacingTarget {
	readonly id: string;
}

interface MemberPlacing {
	readonly tabId: string;
	readonly targetTabId: string;
	readonly side: SplitSide;
}

export interface SplitRefusal {
	readonly refusal: string;
}

export type SplitMove = MovedTabs | SplitRefusal;

export type SplitResizing = BranchShare;

const NOT_HELD = 'the host holds no tab "{id}"';
const SAME_TAB = 'the tab "{id}" cannot stand beside itself';
const NO_TARGET = "no tab is shown to stand beside";
const FULL = 'the split "{id}" holds {most} tabs already';
const ESSENTIAL = 'the essential tab "{id}" stands in no split';
const NO_SPLIT = 'the tab "{id}" stands in no split';
const OTHER_SPLIT = 'the tab "{id}" stands in no place of the split "{split}"';
const NO_EDGE = 'no split has an edge {at} in "{branch}"';

export function isSplitRefusal(move: object): move is SplitRefusal {
	return "refusal" in move;
}

export function placeInView(moment: HostTabsMoment, { tabId, targetTabId, side }: ViewPlacing): SplitMove {
	const target = targetOfPlacing(moment, tabId, targetTabId);

	if (isSplitRefusal(target)) {
		return target;
	}

	const freed = withoutMember(liftedToTop(liftedToTop(moment, tabId), target.id), tabId, target.id);
	const targetSplit = splitOfTab(freed, target.id);
	const full = targetSplit === null ? null : fullRefusalOf(targetSplit, tabId);

	if (full !== null) {
		return full;
	}

	const split = splitPlaced(freed, targetSplit, { tabId, targetTabId: target.id, side });
	return shownIn(freed, split, tabId, `place ${tabId} ${side} of ${target.id} in ${split.id}`);
}

export function removeFromSplit(moment: HostTabsMoment, tabId: string): SplitMove {
	const split = splitOfTab(moment, tabId);

	if (split === null) {
		return { refusal: NO_SPLIT.replace("{id}", tabId) };
	}

	const left = splitWithout(split, (id) => id === tabId);
	return {
		moment: shownAfterLeaving(left === null ? withRemainderInBlock(moment, split, tabId) : moment, {
			split,
			left,
			tabId,
		}),
		reason: `${tabId} leaves ${split.id}${left === null ? `, so ${split.id} dissolves` : ""}`,
	};
}

export function reorderInSplit(moment: HostTabsMoment, tabId: string, before: string | null): SplitMove {
	const split = splitOfTab(moment, tabId);

	if (split === null) {
		return { refusal: NO_SPLIT.replace("{id}", tabId) };
	}

	if (before !== null && !split.memberIds.includes(before)) {
		return { refusal: OTHER_SPLIT.replace("{id}", before).replace("{split}", split.id) };
	}

	const others = split.memberIds.filter((id) => id !== tabId);
	const at = before === null ? others.length : others.indexOf(before);
	const memberIds = [...others.slice(0, at), tabId, ...others.slice(at)];
	return {
		moment: withSplit(moment, { ...split, memberIds }),
		reason: `${split.id} members ${split.memberIds.join(",")} → ${memberIds.join(",")} (${tabId} before ${before ?? "the end"})`,
	};
}

export function carryOutOfSplit(moment: HostTabsMoment, tabId: string): SplitMove {
	const split = splitOfTab(moment, tabId);
	const isShownMember = split !== null && moment.shownSplitId === split.id && moment.shownId === tabId;

	if (split === null || !isShownMember) {
		return removeFromSplit(moment, tabId);
	}

	const left = splitWithout(split, (id) => id === tabId);
	const kept = left === null ? withRemainderInBlock(moment, split, tabId) : moment;
	return {
		moment: {
			...kept,
			splits: splitsWith(kept.splits, split.id, left),
			shownSplitId: null,
		},
		reason: `${tabId} is carried out of ${split.id} and stays shown alone`,
	};
}

export function resizeSplit(moment: HostTabsMoment, resizing: SplitResizing): SplitMove {
	const split = moment.splits.find((one) => isEdgeOf(one.layout, resizing));

	if (split === undefined) {
		return {
			refusal: NO_EDGE.replace("{at}", String(resizing.at)).replace("{branch}", resizing.branchId),
		};
	}

	const resized = { ...split, layout: withBranchShare(split.layout, resizing) };
	return {
		moment: withSplit(moment, resized),
		reason: `${split.id} edge ${resizing.branchId}/${resizing.at} → ${resizing.share.toFixed(3)} (drag)`,
	};
}

export function focusedInSplit(moment: HostTabsMoment, tabId: string): MovedTabs | null {
	const split = splitOfTab(moment, tabId);

	if (split === null) {
		return leftSplit(moment, tabId);
	}

	if (moment.shownSplitId === split.id && split.focusedId === tabId && moment.shownId === tabId) {
		return null;
	}

	return shownIn(moment, { ...split, focusedId: tabId }, tabId, `show ${split.id} focused on ${tabId}`);
}

function leftSplit(moment: HostTabsMoment, tabId: string): MovedTabs | null {
	const shown = shownSplitOf(moment);

	if (shown === null) {
		return null;
	}

	return {
		moment: {
			...moment,
			shownSplitId: null,
		},
		reason: `${shown.id} → off screen, ${tabId} is shown alone`,
	};
}

function withRemainderInBlock(moment: HostTabsMoment, split: KeptSplit, leavingId: string): HostTabsMoment {
	const list = blockListOf(moment, split);
	const anchor = firstListedMember(moment, split, list);
	const remaining = split.memberIds.find((id) => id !== leavingId);

	if (anchor === null || remaining === undefined || anchor === remaining) {
		return moment;
	}

	if (locationOf(moment, remaining)?.chatId !== list) {
		return moment;
	}

	return placeTab(moment, remaining, { chatId: list, groupId: null, before: anchor })?.moment ?? moment;
}

function shownAfterLeaving(moment: HostTabsMoment, { split, left, tabId }: Leaving): HostTabsMoment {
	const isShown = moment.shownSplitId === split.id;
	const leftMoment: HostTabsMoment = {
		...moment,
		splits: splitsWith(moment.splits, split.id, left),
		shownSplitId: isShown && left === null ? null : moment.shownSplitId,
	};

	if (!isShown) {
		return leftMoment;
	}

	return pageShown(leftMoment, left?.focusedId ?? split.memberIds.find((id) => id !== tabId) ?? tabId);
}

function targetOfPlacing(moment: HostTabsMoment, tabId: string, asked: string | null): PlacingTarget | SplitRefusal {
	const shown = asked ?? moment.shownId;
	const target = shown === null ? null : homeTabOf(moment, shown);
	const tab = heldTabOf(moment, tabId);

	if (target === null) {
		return { refusal: NO_TARGET };
	}

	if (tab === undefined) {
		return { refusal: NOT_HELD.replace("{id}", tabId) };
	}

	if (tab.essentialId !== null) {
		return { refusal: ESSENTIAL.replace("{id}", tabId) };
	}

	return target === tabId ? { refusal: SAME_TAB.replace("{id}", tabId) } : { id: target };
}

function fullRefusalOf(split: KeptSplit, tabId: string): SplitRefusal | null {
	const isFull = !split.memberIds.includes(tabId) && split.memberIds.length >= SPLIT_MOST_MEMBERS;
	return isFull ? { refusal: FULL.replace("{id}", split.id).replace("{most}", String(SPLIT_MOST_MEMBERS)) } : null;
}

function splitsWith(splits: readonly KeptSplit[], id: string, left: KeptSplit | null): readonly KeptSplit[] {
	return splits.flatMap((one) => {
		if (one.id !== id) {
			return [one];
		}

		return left === null ? [] : [left];
	});
}

function homeTabOf(moment: HostTabsMoment, tabId: string): string | null {
	const tab = heldTabOf(moment, tabId);

	if (tab === undefined || tab.essentialId !== null) {
		return null;
	}

	const list = locationOf(moment, tabId)?.chatId ?? null;
	return list === null || isSectionList(list) ? tabId : list;
}

function liftedToTop(moment: HostTabsMoment, tabId: string): HostTabsMoment {
	if (isTopLevel(moment, tabId)) {
		return moment;
	}

	const location = locationOf(moment, tabId);
	const list = location !== null && isSectionList(location.chatId) ? location.chatId : WORKSPACE_LIST;
	const before = location !== null && isSectionList(location.chatId) ? location.groupId : null;
	return placeTab(moment, tabId, { chatId: list, groupId: null, before })?.moment ?? moment;
}

function withoutMember(moment: HostTabsMoment, tabId: string, keptWith: string): HostTabsMoment {
	const split = splitOfTab(moment, tabId);

	if (split === null || split.memberIds.includes(keptWith)) {
		return moment;
	}

	return {
		...moment,
		splits: splitsWith(
			moment.splits,
			split.id,
			splitWithout(split, (id) => id === tabId),
		),
	};
}

function splitPlaced(moment: HostTabsMoment, targetSplit: KeptSplit | null, placing: MemberPlacing): KeptSplit {
	return targetSplit === null ? newSplitOf(moment, placing) : splitGrownBy(targetSplit, placing);
}

function newSplitOf(moment: HostTabsMoment, placing: MemberPlacing): KeptSplit {
	const id = `split-${moment.mintedSplits + 1}`;
	return {
		id,
		memberIds: [placing.targetTabId, placing.tabId],
		layout: withLeafPlaced(leafOf(placing.targetTabId), { ...placing, branchId: `${id}-b1` }),
		focusedId: placing.tabId,
	};
}

function splitGrownBy(targetSplit: KeptSplit, placing: MemberPlacing): KeptSplit {
	const isMember = targetSplit.memberIds.includes(placing.tabId);
	const base = isMember ? (withoutLeaf(targetSplit.layout, placing.tabId) ?? targetSplit.layout) : targetSplit.layout;
	const branchId = `${targetSplit.id}-b${nextBranchOf(targetSplit)}`;
	return {
		...targetSplit,
		memberIds: isMember ? targetSplit.memberIds : [...targetSplit.memberIds, placing.tabId],
		layout: withLeafPlaced(base, { ...placing, branchId }),
		focusedId: placing.tabId,
	};
}

function nextBranchOf(split: KeptSplit): number {
	const numbers = branchIdsOf(split.layout).map((id) => Number(/-b(\d+)$/.exec(id)?.[1] ?? 0));
	return Math.max(0, ...numbers) + 1;
}

function withSplit(moment: HostTabsMoment, split: KeptSplit): HostTabsMoment {
	const isNew = !moment.splits.some((one) => one.id === split.id);
	return {
		...moment,
		splits: isNew ? [...moment.splits, split] : moment.splits.map((one) => (one.id === split.id ? split : one)),
		mintedSplits: isNew ? moment.mintedSplits + 1 : moment.mintedSplits,
	};
}

function shownIn(moment: HostTabsMoment, split: KeptSplit, tabId: string, reason: string): MovedTabs {
	return {
		moment: pageShown({ ...withSplit(moment, split), shownSplitId: split.id }, tabId),
		reason,
	};
}

function pageShown(moment: HostTabsMoment, tabId: string): HostTabsMoment {
	const tab = heldTabOf(moment, tabId);
	return tab !== undefined && isPageTab(moment.apps, tab) ? (markShown(moment, tabId)?.moment ?? moment) : moment;
}
