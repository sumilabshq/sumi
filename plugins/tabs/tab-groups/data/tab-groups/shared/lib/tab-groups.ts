import { tabIdsOfGroup, withEntryAt, withoutEntry } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-lists";
import type { ListEntry } from "@widgetarium/navigation/lib/shared/schema/tabs.schema";
import type { TabGroup, TabPlace } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-lists";
import { groupChangeSaid, groupedMoment, isSameGroupFace, newGroupOf, withoutGroup } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs-moment";
import type { GroupBirth, GroupChange, HostTabsMoment } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs-moment";
import type { MovedTabs } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";

export interface AddedGroup extends MovedTabs {
	readonly groupId: string;
}

export function addGroup(moment: HostTabsMoment, birth: GroupBirth): AddedGroup {
	const group = newGroupOf(moment, birth);
	const home = birth.inGroupId === null ? birth.chatId : `${birth.chatId}/${birth.inGroupId}`;
	return {
		groupId: group.id,
		moment: groupedMoment(moment, group, birth),
		reason: `new group ${group.id} "${group.name}" in ${home}${birth.withTabId === null ? "" : ` with ${birth.withTabId}`}`,
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

	const entry = groupEntryOf(group.id);
	return {
		moment: {
			...moment,
			...withEntryAt(withoutEntry(moment, entry), entry, place),
		},
		reason: `place group ${group.id} in ${place.chatId}/${place.groupId ?? "list"} before ${place.before ?? "the end"}`,
	};
}

export function ungroup(moment: HostTabsMoment, group: TabGroup): MovedTabs {
	return {
		moment: {
			...moment,
			...withoutGroup(moment, group.id, group.entries),
		},
		reason: `ungroup ${group.id}, ${group.entries.length} entries (${tabIdsOfGroup(moment.groups, group).length} tabs) spill where it stood`,
	};
}

function groupEntryOf(id: string): ListEntry {
	return {
		kind: "group",
		id,
	};
}
