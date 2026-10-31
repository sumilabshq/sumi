import { withEntryBefore } from "./tab-lists.js";
import type { ListEntry } from "../../schema/tabs.schema.js";
import type { ChatLists, TabGroup, TabPlace } from "./tab-lists.js";
import { groupChangeSaid, groupedMoment, isSameGroupFace, newGroupOf, withoutGroup } from "./host-tabs-moment.js";
import type { GroupChange, HostTabsMoment } from "./host-tabs-moment.js";
import type { MovedTabs } from "./host-tabs.js";

export interface AddedGroup extends MovedTabs {
	readonly groupId: string;
}

export function addGroup(moment: HostTabsMoment, chatId: string, withTabId: string | null): AddedGroup {
	const birth = {
		chatId,
		withTabId,
	};
	const group = newGroupOf(moment, birth);
	return {
		groupId: group.id,
		moment: groupedMoment(moment, group, birth),
		reason: `new group ${group.id} "${group.name}" in ${chatId}${withTabId === null ? "" : ` with ${withTabId}`}`,
	};
}

export function changeGroup(moment: HostTabsMoment, group: TabGroup, change: GroupChange): MovedTabs | null {
	const next = {
		...group,
		...change,
	};

	if (isSameGroupFace(next, group)) {
		return null;
	}

	return {
		moment: {
			...moment,
			groups: moment.groups.map((one) => (one.id === next.id ? next : one)),
		},
		reason: groupChangeSaid(group, next),
	};
}

export function placeGroup(moment: HostTabsMoment, group: TabGroup, place: TabPlace): MovedTabs | null {
	if (place.before === group.id) {
		return null;
	}

	return {
		moment: {
			...moment,
			lists: withEntryBefore(
				listsWithoutEntry(moment.lists, group.id),
				place.chatId,
				groupEntryOf(group.id),
				place.before,
			),
		},
		reason: `place group ${group.id} in ${place.chatId} before ${place.before ?? "the end"}`,
	};
}

export function ungroup(moment: HostTabsMoment, group: TabGroup): MovedTabs {
	return {
		moment: {
			...moment,
			...withoutGroup(moment, group.id, group.tabIds),
		},
		reason: `ungroup ${group.id}, ${group.tabIds.length} tabs`,
	};
}

function listsWithoutEntry(lists: ChatLists, id: string): ChatLists {
	return Object.fromEntries(
		Object.entries(lists).map(([chatId, entries]) => [chatId, entries.filter((one) => one.id !== id)]),
	);
}

function groupEntryOf(id: string): ListEntry {
	return {
		kind: "group",
		id,
	};
}
