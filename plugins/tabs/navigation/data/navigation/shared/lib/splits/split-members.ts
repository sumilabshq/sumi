import type { KeptSplit, SplitNode } from "../../schema/splits.schema.js";
import { SPLIT_LEAST_MEMBERS, SPLIT_MOST_MEMBERS } from "../../schema/splits.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs-moment.js";
import { findGroup, isSectionList, locationOf } from "../tabs/tab-lists.js";
import type { TabLayout, TabLocation } from "../tabs/tab-lists.js";
import type { ListEntry } from "../../schema/tabs.schema.js";
import { leafIdsOf, withoutLeaf } from "./split-tree.js";

const TOO_FEW = 'the split "{id}" holds {count} tabs: a split holds {least} to {most}';
const LEAVES_DIFFER = 'the split "{id}" draws tabs other than its members';
const FOCUS_OUTSIDE = 'the split "{id}" focuses "{focused}", which is not its member';
const IN_TWO_SPLITS = 'the tab "{tab}" stands in {count} splits: a tab stands in one at most';
const NOT_TOP_LEVEL = 'the tab "{tab}" stands in the split "{id}" from inside a page';
const SPREAD = 'the split "{id}" spreads over {count} places: its tabs stand in one list or one group';

export function splitOfTab(moment: Pick<HostTabsMoment, "splits">, tabId: string): KeptSplit | null {
	return moment.splits.find((split) => split.memberIds.includes(tabId)) ?? null;
}

export function firstListedMember(moment: TabLayout, split: KeptSplit, list: string): string | null {
	return firstAmong(moment.lists[list] ?? [], split);
}

export function firstAmong(entries: readonly ListEntry[], split: KeptSplit): string | null {
	return entries.find((entry) => entry.kind === "tab" && split.memberIds.includes(entry.id))?.id ?? null;
}

export function containerEntriesOf(moment: TabLayout, location: TabLocation): readonly ListEntry[] {
	return location.groupId === null
		? (moment.lists[location.chatId] ?? [])
		: (findGroup(moment.groups, location.groupId)?.entries ?? []);
}

export function firstInContainer(moment: TabLayout, split: KeptSplit, tabId: string): string | null {
	const location = locationOf(moment, tabId);
	return location === null ? null : firstAmong(containerEntriesOf(moment, location), split);
}

export function shownSplitOf(moment: Pick<HostTabsMoment, "splits" | "shownSplitId">): KeptSplit | null {
	return moment.splits.find((split) => split.id === moment.shownSplitId) ?? null;
}

export function standsInSection(moment: TabLayout, tabId: string): boolean {
	const location = locationOf(moment, tabId);
	return location !== null && isSectionList(location.chatId);
}

export function splitsPruned(moment: HostTabsMoment): HostTabsMoment {
	const splits = moment.splits.flatMap((split) => {
		const home = homeOf(moment, split);
		const pruned = splitWithout(split, (id) => containerKeyOf(moment, id) !== home);
		return pruned === null ? [] : [pruned];
	});

	if (splits.length === moment.splits.length && splits.every((split, at) => split === moment.splits[at])) {
		return moment;
	}

	const isShownKept = splits.some((split) => split.id === moment.shownSplitId);
	return {
		...moment,
		splits,
		shownSplitId: isShownKept ? moment.shownSplitId : null,
	};
}

export function splitWithout(split: KeptSplit, isGone: (tabId: string) => boolean): KeptSplit | null {
	const goneIds = split.memberIds.filter(isGone);

	if (goneIds.length === 0) {
		return split;
	}

	const left = remainderOf(split, goneIds);

	if (left === null) {
		return null;
	}

	const focusedId = left.memberIds.includes(split.focusedId) ? split.focusedId : (left.memberIds[0] ?? split.focusedId);
	return {
		...split,
		...left,
		focusedId,
	};
}

export function splitBreaksOf(moment: HostTabsMoment): readonly string[] {
	return [...moment.splits.flatMap((split) => breaksOfSplit(moment, split)), ...tabsInTwoSplits(moment)];
}

function breaksOfSplit(moment: HostTabsMoment, split: KeptSplit): readonly string[] {
	const notTop = split.memberIds
		.filter((id) => !standsInSection(moment, id))
		.map((id) => NOT_TOP_LEVEL.replace("{tab}", id).replace("{id}", split.id));
	const places = new Set(split.memberIds.map((id) => containerKeyOf(moment, id)));
	const spread = places.size > 1 ? [SPREAD.replace("{id}", split.id).replace("{count}", String(places.size))] : [];
	return [...shapeBreaksOf(split), ...notTop, ...spread];
}

function containerKeyOf(moment: TabLayout, tabId: string): string | null {
	const location = locationOf(moment, tabId);
	return location === null || !isSectionList(location.chatId) ? null : `${location.chatId}/${location.groupId ?? ""}`;
}

function homeOf(moment: TabLayout, split: KeptSplit): string | null {
	const keys = split.memberIds.map((id) => containerKeyOf(moment, id)).filter((key): key is string => key !== null);
	const counts = new Map<string, number>();

	for (const key of keys) {
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const focused = containerKeyOf(moment, split.focusedId);
	const most = Math.max(0, ...counts.values());
	return focused !== null && counts.get(focused) === most
		? focused
		: (keys.find((key) => counts.get(key) === most) ?? null);
}

function shapeBreaksOf(split: KeptSplit): readonly string[] {
	const count = split.memberIds.length;
	const leaves = [...leafIdsOf(split.layout)].sort();
	const members = [...split.memberIds].sort();
	const faults: readonly (readonly [boolean, string])[] = [
		[count < SPLIT_LEAST_MEMBERS || count > SPLIT_MOST_MEMBERS, tooFewSaid(split.id, count)],
		[leaves.join() !== members.join(), LEAVES_DIFFER.replace("{id}", split.id)],
		[
			!split.memberIds.includes(split.focusedId),
			FOCUS_OUTSIDE.replace("{id}", split.id).replace("{focused}", split.focusedId),
		],
	];
	return faults.flatMap(([isFault, message]) => (isFault ? [message] : []));
}

function tooFewSaid(id: string, count: number): string {
	return TOO_FEW.replace("{id}", id)
		.replace("{count}", String(count))
		.replace("{least}", String(SPLIT_LEAST_MEMBERS))
		.replace("{most}", String(SPLIT_MOST_MEMBERS));
}

function remainderOf(split: KeptSplit, goneIds: readonly string[]): Pick<KeptSplit, "memberIds" | "layout"> | null {
	const memberIds = split.memberIds.filter((id) => !goneIds.includes(id));
	const layout = layoutWithout(split.layout, goneIds);
	return layout === null || memberIds.length < SPLIT_LEAST_MEMBERS ? null : { memberIds, layout };
}

function layoutWithout(layout: SplitNode, goneIds: readonly string[]): SplitNode | null {
	return goneIds.reduce<SplitNode | null>((left, id) => (left === null ? null : withoutLeaf(left, id)), layout);
}

function tabsInTwoSplits(moment: HostTabsMoment): readonly string[] {
	const memberIds = moment.splits.flatMap((split) => split.memberIds);
	const repeated = [...new Set(memberIds.filter((id, at) => memberIds.indexOf(id) !== at))];
	return repeated.map((id) =>
		IN_TWO_SPLITS.replace("{tab}", id).replace("{count}", String(memberIds.filter((one) => one === id).length)),
	);
}
