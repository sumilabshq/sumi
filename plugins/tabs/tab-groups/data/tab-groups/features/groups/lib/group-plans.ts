import type { CreateGroupAsk, GroupPlaceAsked } from "../../../shared/schema/group-asks.schema.js";
import { movedPlan, refusal } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import type { MomentPlan, Refusal } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import {
	chatOfGroup,
	chatOfTab,
	findGroup,
	groupsUnder,
	heldTabOf,
	isKnownList,
	tabIdsOfGroup,
} from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import type { GroupChange, HostTabsMoment, TabGroup } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import { addGroup, changeGroup, placeGroup, ungroup } from "../../../shared/lib/tab-groups.js";
import { beforeIdOfBlock } from "@widgetarium/navigation/lib/features/tab-placing/lib/placing-plans";
import { refuseStanding } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-invariants";
import type { AddedGroup } from "../../../shared/lib/tab-groups.js";

const NO_GROUP = 'no group "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const UNKNOWN_LIST = 'no tab list "{list}" is here';
const NAMELESS = "a group needs a name";
const GROUP_NOT_IN_LIST = 'no group "{group}" stands in the tab list "{list}"';
const INSIDE_ITSELF = 'the group "{id}" cannot stand inside "{group}": that is itself or a group it holds';
const REFUSED_IN_GROUP = 'the group "{id}" holds a tab whose app does not let it stand inside "{list}"';

interface GroupBirth {
	readonly chatId: string;
	readonly withTabId: string | null;
	readonly inGroupId: string | null;
}

export function createGroupPlan({ from, name, hue }: Omit<CreateGroupAsk, "window">): MomentPlan<string> {
	return (moment) => {
		const birth = birthOf(moment, from);

		if ("refusal" in birth) {
			return birth;
		}

		const added = withGroupFaced(addGroup(moment, birth), {
			...(name === undefined ? {} : { name }),
			...(hue === undefined ? {} : { hue }),
		});
		return movedPlan(moment, added, added.groupId);
	};
}

export function renameGroupPlan(id: string, name: string): MomentPlan<null> {
	return groupChanging(id, () => (name.trim() === "" ? NAMELESS : { name: name.trim() }));
}

export function groupHuePlan(id: string, hue: TabGroup["hue"]): MomentPlan<null> {
	return groupChanging(id, () => ({ hue }));
}

export function foldGroupPlan(id: string): MomentPlan<null> {
	return groupChanging(id, (group) => ({ isOpen: !group.isOpen }));
}

export function placeGroupPlan(id: string, asked: GroupPlaceAsked): MomentPlan<null> {
	return (moment) => {
		const group = findGroup(moment.groups, id);

		if (group === undefined) {
			return refusal(NO_GROUP.replace("{id}", id));
		}

		const refused = groupPlaceRefusalOf(moment, group, asked);

		if (refused !== null) {
			return refusal(refused);
		}

		const before = asked.groupId === null ? beforeIdOfBlock(moment, id, asked) : asked.before;
		return movedPlan(moment, placeGroup(moment, group, { chatId: asked.list, groupId: asked.groupId, before }), null);
	};
}

export function ungroupPlan(id: string): MomentPlan<null> {
	return (moment) => {
		const group = findGroup(moment.groups, id);
		return group === undefined
			? refusal(NO_GROUP.replace("{id}", id))
			: movedPlan(moment, ungroup(moment, group), null);
	};
}

function groupChanging(id: string, changeOf: (group: TabGroup) => GroupChange | string): MomentPlan<null> {
	return (moment) => {
		const group = findGroup(moment.groups, id);

		if (group === undefined) {
			return refusal(NO_GROUP.replace("{id}", id));
		}

		const change = changeOf(group);
		return typeof change === "string" ? refusal(change) : movedPlan(moment, changeGroup(moment, group, change), null);
	};
}

function birthOf(moment: HostTabsMoment, from: CreateGroupAsk["from"]): GroupBirth | Refusal {
	if (from.kind === "list") {
		return isKnownList(from.list)
			? { chatId: from.list, withTabId: null, inGroupId: null }
			: refusal(UNKNOWN_LIST.replace("{list}", from.list));
	}

	if (from.kind === "group") {
		const chatId = chatOfGroup(moment, from.groupId);
		return chatId === null
			? refusal(NO_GROUP.replace("{id}", from.groupId))
			: { chatId, withTabId: null, inGroupId: from.groupId };
	}

	const chatId = chatOfTab(moment, from.tabId);
	return chatId === null
		? refusal(NOT_LISTED.replace("{id}", from.tabId))
		: { chatId, withTabId: from.tabId, inGroupId: null };
}

function withGroupFaced(added: AddedGroup, face: GroupChange): AddedGroup {
	const group = findGroup(added.moment.groups, added.groupId);
	const faced = group === undefined ? null : changeGroup(added.moment, group, face);

	if (faced === null) {
		return added;
	}

	return {
		...added,
		moment: faced.moment,
		reason: `${added.reason}; ${faced.reason}`,
	};
}

function groupPlaceRefusalOf(moment: HostTabsMoment, group: TabGroup, { list, groupId }: GroupPlaceAsked): string | null {
	if (!isKnownList(list)) {
		return UNKNOWN_LIST.replace("{list}", list);
	}

	if (groupId !== null && chatOfGroup(moment, groupId) !== list) {
		return GROUP_NOT_IN_LIST.replace("{group}", groupId).replace("{list}", list);
	}

	const own = [group, ...groupsUnder(moment.groups, group.entries, new Set([group.id]))];

	if (own.some((one) => one.id === groupId)) {
		return INSIDE_ITSELF.replace("{id}", group.id).replace("{group}", groupId ?? "");
	}

	const holdsRefused = tabIdsOfGroup(moment.groups, group).some((tabId) => {
		const tab = heldTabOf(moment, tabId);
		return tab !== undefined && refuseStanding(tab, list) !== null;
	});
	return holdsRefused ? REFUSED_IN_GROUP.replace("{id}", group.id).replace("{list}", list) : null;
}
