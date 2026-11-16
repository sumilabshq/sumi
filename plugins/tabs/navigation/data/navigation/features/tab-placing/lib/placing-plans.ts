import type { TabPlaceAsked } from "../../../shared/schema/tab-asks.schema.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withMoved } from "../../../shared/lib/showing/showing.js";
import { heldTabOf, isKnownList, placeTab, renameTab } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { refuseStanding } from "../../../shared/lib/tabs/tab-invariants.js";
import { carryOutOfSplit, isSplitRefusal } from "../../../shared/lib/splits/split-moves.js";
import type { SplitMove } from "../../../shared/lib/splits/split-moves.js";
import { firstListedMember, splitOfTab } from "../../../shared/lib/splits/split-members.js";
import { WORKSPACE_LIST, chatOfGroup, locationOf } from "../../../shared/lib/tabs/tab-lists.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const UNKNOWN_LIST = 'no tab list "{list}" is here: a tab stands in the list of a window';
const GROUP_NOT_IN_LIST = 'no group "{group}" stands in the tab list "{list}"';

export function placeTabPlan(id: string, asked: TabPlaceAsked): ShowingPlan {
	return (showing) => {
		const refused = placeRefusalOf(showing.moment, id, asked);

		if (refused !== null) {
			return refusal(refused);
		}

		const freed = freedFromBlock(showing.moment, id);

		if (freed !== null && isSplitRefusal(freed)) {
			return refusal(freed.refusal);
		}

		const moment = freed?.moment ?? showing.moment;
		const before = beforeIdOfBlock(showing.moment, id, asked);
		const place = { chatId: asked.list, groupId: asked.groupId, before };
		return withMoved(withMoved(showing, freed), placeTab(moment, id, place));
	};
}

export function beforeIdOfBlock(moment: HostTabsMoment, id: string, { list, before }: TabPlaceAsked): string | null {
	const split = before === null ? null : splitOfTab(moment, before);

	if (split === null || list !== WORKSPACE_LIST) {
		return before;
	}

	const others = { ...split, memberIds: split.memberIds.filter((member) => member !== id) };
	return firstListedMember(moment, others, list) ?? before;
}

export function renamePlan(id: string, label: string): MomentPlan<null> {
	return (moment) =>
		heldTabOf(moment, id)
			? movedPlan(moment, renameTab(moment, id, label), null)
			: refusal(NOT_HELD.replace("{id}", id));
}

function freedFromBlock(moment: HostTabsMoment, id: string): SplitMove | null {
	const split = splitOfTab(moment, id);

	if (split === null || locationOf(moment, id)?.chatId !== WORKSPACE_LIST) {
		return null;
	}

	return carryOutOfSplit(moment, id);
}

function placeRefusalOf(moment: HostTabsMoment, id: string, asked: TabPlaceAsked): string | null {
	const tab = heldTabOf(moment, id);

	if (!tab) {
		return NOT_HELD.replace("{id}", id);
	}

	return refuseStanding(tab, asked.list) ?? listRefusalOf(moment, asked);
}

function listRefusalOf(moment: HostTabsMoment, asked: TabPlaceAsked): string | null {
	if (!isKnownList(asked.list)) {
		return UNKNOWN_LIST.replace("{list}", asked.list);
	}

	const isGroupElsewhere = asked.groupId !== null && chatOfGroup(moment, asked.groupId) !== asked.list;
	return isGroupElsewhere
		? GROUP_NOT_IN_LIST.replace("{group}", asked.groupId ?? "").replace("{list}", asked.list)
		: null;
}
