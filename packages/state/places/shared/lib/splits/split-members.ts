import type { KeptSplit, SplitNode } from "../../schema/splits.schema.js";
import { SPLIT_LEAST_MEMBERS, SPLIT_MOST_MEMBERS } from "../../schema/splits.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs-moment.js";
import { isSectionList, locationOf } from "../tabs/tab-lists.js";
import { leafIdsOf, withoutLeaf } from "./split-tree.js";

const TOO_FEW = 'the split "{id}" holds {count} tabs: a split holds {least} to {most}';
const LEAVES_DIFFER = 'the split "{id}" draws tabs other than its members';
const FOCUS_OUTSIDE = 'the split "{id}" focuses "{focused}", which is not its member';
const IN_TWO_SPLITS = 'the tab "{tab}" stands in {count} splits: a tab stands in one at most';
const NOT_TOP_LEVEL = 'the tab "{tab}" stands in the split "{id}" from inside a chat or a group';

export function splitOfTab(moment: Pick<HostTabsMoment, "splits">, tabId: string): KeptSplit | null {
	return moment.splits.find((split) => split.memberIds.includes(tabId)) ?? null;
}

export function shownSplitOf(moment: Pick<HostTabsMoment, "splits" | "shownSplitId">): KeptSplit | null {
	return moment.splits.find((split) => split.id === moment.shownSplitId) ?? null;
}

export function isTopLevel(moment: HostTabsMoment, tabId: string): boolean {
	const location = locationOf(moment, tabId);
	return location !== null && location.groupId === null && isSectionList(location.chatId);
}

export function splitsPruned(moment: HostTabsMoment): HostTabsMoment {
	const splits = moment.splits.flatMap((split) => {
		const pruned = splitWithout(split, (id) => !isTopLevel(moment, id));
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
		.filter((id) => !isTopLevel(moment, id))
		.map((id) => NOT_TOP_LEVEL.replace("{tab}", id).replace("{id}", split.id));
	return [...shapeBreaksOf(split), ...notTop];
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
