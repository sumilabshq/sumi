import type { ListEntry } from "../../schema/tabs.schema.js";
import type { HostTabsMoment } from "./host-tabs-moment.js";
import { isChatTab } from "./app-abilities.js";
import { CHAT_HOLDS_CHAT, CHAT_HOLDS_GROUP, isChatList, isPlaceableList } from "./chat-lists.js";
import type { ChatListFacts } from "./chat-lists.js";
import { chatOfGroup, flatTabIdsOf, isSectionList } from "./tab-lists.js";

const LIST_OF_NO_WINDOW = 'the list "{list}" belongs to no tab: only the workspace and a chat own a list';
const REFUSED_STANDING = 'the tab "{id}" cannot stand inside "{list}": a tab stands in the list of the workspace or of a chat';
const CHAT_IN_CHAT = 'the tab "{id}" cannot stand inside "{list}": {said}';
const GROUP_IN_CHAT = 'the group "{id}" stands inside the chat "{list}": {said}';
const NOT_ONE_PLACE = 'the tab "{id}" stands in {count} places: a tab stands in exactly one list';
const UNKNOWN_ENTRY = 'the list "{list}" names "{id}", which is no tab or group here';
const GROUP_NOT_ONE_LIST = 'the group "{id}" stands in {count} places: a group stands in exactly one list or group';
const GROUP_IN_NO_LIST = 'the group "{id}" hangs under no list: a group reaches a list through the groups holding it';

interface Standing {
	readonly list: string;
	readonly tabId: string;
}

type TabLaws = Pick<HostTabsMoment, "tabs" | "lists" | "groups" | "apps">;

export function refuseStanding(
	facts: Pick<ChatListFacts, "tabs" | "apps">,
	tab: Pick<ChatListFacts["tabs"][number], "id" | "app">,
	list: string,
): string | null {
	if (isSectionList(list)) {
		return null;
	}

	if (!isChatList(facts, list)) {
		return REFUSED_STANDING.replace("{id}", tab.id).replace("{list}", list);
	}

	return isChatTab(facts.apps, tab)
		? CHAT_IN_CHAT.replace("{id}", tab.id).replace("{list}", list).replace("{said}", CHAT_HOLDS_CHAT)
		: null;
}

export function tabBreaksOf(moment: TabLaws): readonly string[] {
	return [
		...listsOfNoWindow(moment),
		...unknownEntries(moment),
		...groupsNotInOneList(moment),
		...groupsUnderNoList(moment),
		...groupsInChats(moment),
		...tabsStandingRefused(moment),
		...tabsNotInOnePlace(moment),
	];
}

function listsOfNoWindow(moment: TabLaws): readonly string[] {
	return Object.keys(moment.lists)
		.filter((list) => !isPlaceableList(moment, list))
		.map((list) => LIST_OF_NO_WINDOW.replace("{list}", list));
}

function unknownEntries(moment: TabLaws): readonly string[] {
	const tabIds = new Set(moment.tabs.map((tab) => tab.id));
	const groupIds = new Set(moment.groups.map((group) => group.id));
	const holders: readonly (readonly [string, readonly ListEntry[]])[] = [
		...Object.entries(moment.lists),
		...moment.groups.map((group) => [group.id, group.entries] as const),
	];
	return holders.flatMap(([holder, entries]) =>
		entries
			.filter((entry) => !(entry.kind === "tab" ? tabIds : groupIds).has(entry.id))
			.map((entry) => UNKNOWN_ENTRY.replace("{list}", holder).replace("{id}", entry.id)),
	);
}

function groupsNotInOneList(moment: TabLaws): readonly string[] {
	const listed = [...Object.values(moment.lists), ...moment.groups.map((group) => group.entries)].flatMap((entries) =>
		entries.filter((entry) => entry.kind === "group").map((entry) => entry.id),
	);
	const counts = countsOf(listed);
	return moment.groups
		.filter((group) => (counts.get(group.id) ?? 0) !== 1)
		.map((group) => GROUP_NOT_ONE_LIST.replace("{id}", group.id).replace("{count}", String(counts.get(group.id) ?? 0)));
}

function groupsUnderNoList(moment: TabLaws): readonly string[] {
	return moment.groups
		.filter((group) => chatOfGroup(moment, group.id) === null)
		.map((group) => GROUP_IN_NO_LIST.replace("{id}", group.id));
}

function groupsInChats(moment: TabLaws): readonly string[] {
	return moment.groups.flatMap((group) => {
		const list = chatOfGroup(moment, group.id);
		return list !== null && isChatList(moment, list)
			? [GROUP_IN_CHAT.replace("{id}", group.id).replace("{list}", list).replace("{said}", CHAT_HOLDS_GROUP)]
			: [];
	});
}

function tabsStandingRefused(moment: TabLaws): readonly string[] {
	const tabOf = new Map(moment.tabs.map((tab) => [tab.id, tab]));
	return standingsOf(moment).flatMap(({ list, tabId }) => {
		const tab = tabOf.get(tabId);
		const refusal = tab === undefined ? null : refuseStanding(moment, tab, list);
		return refusal === null ? [] : [refusal];
	});
}

function tabsNotInOnePlace(moment: TabLaws): readonly string[] {
	const counts = countsOf(standingsOf(moment).map(({ tabId }) => tabId));
	return moment.tabs
		.filter((tab) => (counts.get(tab.id) ?? 0) !== 1)
		.map((tab) => NOT_ONE_PLACE.replace("{id}", tab.id).replace("{count}", String(counts.get(tab.id) ?? 0)));
}

function countsOf(ids: readonly string[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();

	for (const id of ids) {
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return counts;
}

function standingsOf(moment: TabLaws): readonly Standing[] {
	return Object.keys(moment.lists).flatMap((list) => flatTabIdsOf(moment, list).map((tabId) => ({ list, tabId })));
}
