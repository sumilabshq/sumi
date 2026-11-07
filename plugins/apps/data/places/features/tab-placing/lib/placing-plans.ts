import { pinTab } from "../../../shared/lib/tabs/chat-tabs.js";
import type { TabPlaceAsked } from "../../../shared/schema/tab-asks.schema.js";
import type { EssentialFace } from "../../../shared/schema/tab-rows.schema.js";
import { essentialFaceOf } from "../../../shared/lib/rows/essential-face.js";
import { movedPlan, plannedWith, refusal } from "../../../shared/lib/settling/settling.js";
import type { ExtraPlan, MomentPlan, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withHomeFollowed } from "../../../shared/lib/showing/rehoming.js";
import { withMoved } from "../../../shared/lib/showing/showing.js";
import {
	heldTabOf,
	isKnownList,
	foldTab,
	makeEssential,
	placeTab,
	renameTab,
} from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { carryOutOfSplit, isSplitRefusal } from "../../../shared/lib/splits/split-moves.js";
import type { SplitMove } from "../../../shared/lib/splits/split-moves.js";
import { blockListOf, firstListedMember, splitOfTab } from "../../../shared/lib/splits/split-members.js";
import { holdsTabs } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { AppKind } from "../../../shared/schema/tabs.schema.js";
import { chatOfGroup, isSectionList, locationOf } from "../../../shared/lib/tabs/tab-lists.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const UNKNOWN_LIST = 'no tab list "{list}" is here: a tab stands in Open, Pinned or a chat';
const GROUP_NOT_IN_LIST = 'no group "{group}" stands in the tab list "{list}"';
const HOLDS_NOTHING = 'the tab "{id}" holds no tabs: there is nothing under it to fold';
const HOLDER_IN_HOLDER = 'the tab "{id}" holds tabs of its own: it cannot stand inside "{list}"';

export function placeTabPlan(id: string, asked: TabPlaceAsked): ShowingPlan {
	return (showing, facts) => {
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
		return withHomeFollowed(showing, withMoved(withMoved(showing, freed), placeTab(moment, id, place)), facts);
	};
}

export function beforeIdOfBlock(moment: HostTabsMoment, id: string, { list, before }: TabPlaceAsked): string | null {
	const split = before === null ? null : splitOfTab(moment, before);

	if (split === null || blockListOf(moment, split) !== list) {
		return before;
	}

	const others = { ...split, memberIds: split.memberIds.filter((member) => member !== id) };
	return firstListedMember(moment, others, list) ?? before;
}

export function makeEssentialPlan(id: string, essentialId: string): ExtraPlan<EssentialFace> {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const face = essentialFaceOf(showing.moment.apps, tab, showing.moment.tabs, facts.pages);
		return plannedWith(withMoved(showing, makeEssential(showing.moment, id, essentialId)), face);
	};
}

export function renamePlan(id: string, label: string): MomentPlan<null> {
	return (moment) =>
		heldTabOf(moment, id)
			? movedPlan(moment, renameTab(moment, id, label), null)
			: refusal(NOT_HELD.replace("{id}", id));
}

export function foldTabPlan(id: string): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		if (!holdsTabs(moment.apps, tab)) {
			return refusal(HOLDS_NOTHING.replace("{id}", id));
		}

		return movedPlan(moment, foldTab(moment, tab), null);
	};
}

export function pinPlan(id: string, isPinned: boolean): MomentPlan<null> {
	return (moment) =>
		heldTabOf(moment, id)
			? movedPlan(moment, pinTab(moment, id, isPinned), null)
			: refusal(NOT_HELD.replace("{id}", id));
}

export function isHolderInChat(apps: PlacedApps, tab: { readonly app: AppKind }, list: string): boolean {
	return holdsTabs(apps, tab) && !isSectionList(list);
}

function freedFromBlock(moment: HostTabsMoment, id: string): SplitMove | null {
	const split = splitOfTab(moment, id);

	if (split === null || locationOf(moment, id)?.chatId !== blockListOf(moment, split)) {
		return null;
	}

	return carryOutOfSplit(moment, id);
}

function placeRefusalOf(moment: HostTabsMoment, id: string, asked: TabPlaceAsked): string | null {
	const tab = heldTabOf(moment, id);

	if (!tab) {
		return NOT_HELD.replace("{id}", id);
	}

	if (isHolderInChat(moment.apps, tab, asked.list)) {
		return HOLDER_IN_HOLDER.replace("{id}", id).replace("{list}", asked.list);
	}

	return listRefusalOf(moment, asked);
}

function listRefusalOf(moment: HostTabsMoment, asked: TabPlaceAsked): string | null {
	if (!isKnownList(moment, asked.list)) {
		return UNKNOWN_LIST.replace("{list}", asked.list);
	}

	const isGroupElsewhere = asked.groupId !== null && chatOfGroup(moment, asked.groupId) !== asked.list;
	return isGroupElsewhere
		? GROUP_NOT_IN_LIST.replace("{group}", asked.groupId ?? "").replace("{list}", asked.list)
		: null;
}
