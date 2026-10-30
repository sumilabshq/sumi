import type { CreateGroupAsk } from "../../../shared/schema/tab-asks.schema.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, Refusal } from "../../../shared/lib/settling/settling.js";
import { chatOfTab, findGroup, isKnownList } from "../../../shared/lib/tabs/host-tabs.js";
import type { GroupChange, HostTabsMoment, TabGroup } from "../../../shared/lib/tabs/host-tabs.js";
import { addGroup, changeGroup, ungroup } from "../../../shared/lib/tabs/tab-groups.js";
import type { AddedGroup } from "../../../shared/lib/tabs/tab-groups.js";

const NO_GROUP = 'no group "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const UNKNOWN_LIST = 'no tab list "{list}" is here';
const NAMELESS = "a group needs a name";

interface GroupBirth {
	readonly listId: string;
	readonly withTabId: string | null;
}

export function createGroupPlan({ from, name, hue }: Omit<CreateGroupAsk, "window">): MomentPlan<string> {
	return (moment) => {
		const birth = birthOf(moment, from);

		if ("refusal" in birth) {
			return birth;
		}

		const added = withGroupFaced(addGroup(moment, birth.listId, birth.withTabId), {
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
		return isKnownList(moment, from.list)
			? { listId: from.list, withTabId: null }
			: refusal(UNKNOWN_LIST.replace("{list}", from.list));
	}

	const listId = chatOfTab(moment, from.tabId);
	return listId === null ? refusal(NOT_LISTED.replace("{id}", from.tabId)) : { listId, withTabId: from.tabId };
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
