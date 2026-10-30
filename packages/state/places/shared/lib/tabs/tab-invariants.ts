import type { ListEntry } from "../../schema/tabs.schema.js";
import type { HostTabsMoment } from "./host-tabs-moment.js";
import { findGroup, isSectionList } from "./tab-lists.js";

const LIST_OF_NO_CHAT = 'the list "{list}" belongs to no chat: only a chat holds tabs of its own';
const CHAT_IN_CHAT = 'the chat "{id}" stands inside the chat "{list}": a chat holds no chat';
const NOT_ONE_PLACE = 'the tab "{id}" stands in {count} places: a tab stands in exactly one list';
const UNKNOWN_ENTRY = 'the list "{list}" names "{id}", which is no tab or group here';
const GROUP_NOT_ONE_LIST = 'the group "{id}" stands in {count} lists: a group stands in exactly one';

interface Standing {
	readonly list: string;
	readonly tabId: string;
}

type TabLaws = Pick<HostTabsMoment, "tabs" | "lists" | "groups">;

export function tabBreaksOf(moment: TabLaws): readonly string[] {
	return [
		...listsOfNoChat(moment),
		...unknownEntries(moment),
		...groupsNotInOneList(moment),
		...chatsInChats(moment),
		...tabsNotInOnePlace(moment),
	];
}

function chatIdsOf(moment: TabLaws): ReadonlySet<string> {
	return new Set(moment.tabs.filter((tab) => tab.app === "chat").map((tab) => tab.id));
}

function listsOfNoChat(moment: TabLaws): readonly string[] {
	const chatIds = chatIdsOf(moment);
	return Object.keys(moment.lists)
		.filter((list) => !isSectionList(list) && !chatIds.has(list))
		.map((list) => LIST_OF_NO_CHAT.replace("{list}", list));
}

function unknownEntries(moment: TabLaws): readonly string[] {
	const tabIds = new Set(moment.tabs.map((tab) => tab.id));
	const groupIds = new Set(moment.groups.map((group) => group.id));
	return Object.entries(moment.lists).flatMap(([list, entries]) =>
		entries
			.filter((entry) => !(entry.kind === "tab" ? tabIds : groupIds).has(entry.id))
			.map((entry) => UNKNOWN_ENTRY.replace("{list}", list).replace("{id}", entry.id)),
	);
}

function groupsNotInOneList(moment: TabLaws): readonly string[] {
	const listed = Object.values(moment.lists).flatMap((entries) =>
		entries.filter((entry) => entry.kind === "group").map((entry) => entry.id),
	);
	const countOf = (id: string): number => listed.filter((one) => one === id).length;
	return moment.groups
		.filter((group) => countOf(group.id) !== 1)
		.map((group) => GROUP_NOT_ONE_LIST.replace("{id}", group.id).replace("{count}", String(countOf(group.id))));
}

function chatsInChats(moment: TabLaws): readonly string[] {
	const chatIds = chatIdsOf(moment);
	return standingsOf(moment)
		.filter(({ list, tabId }) => !isSectionList(list) && chatIds.has(tabId))
		.map(({ list, tabId }) => CHAT_IN_CHAT.replace("{id}", tabId).replace("{list}", list));
}

function tabsNotInOnePlace(moment: TabLaws): readonly string[] {
	const standings = standingsOf(moment);
	const countOf = (id: string): number => standings.filter((standing) => standing.tabId === id).length;
	return moment.tabs
		.filter((tab) => countOf(tab.id) !== (tab.essentialId === null ? 1 : 0))
		.map((tab) => NOT_ONE_PLACE.replace("{id}", tab.id).replace("{count}", String(countOf(tab.id))));
}

function standingsOf(moment: TabLaws): readonly Standing[] {
	return Object.entries(moment.lists).flatMap(([list, entries]) =>
		entries.flatMap((entry) => entryStandingsOf(moment, list, entry)),
	);
}

function entryStandingsOf(moment: TabLaws, list: string, entry: ListEntry): readonly Standing[] {
	if (entry.kind === "tab") {
		return [{ list, tabId: entry.id }];
	}

	return (findGroup(moment.groups, entry.id)?.tabIds ?? []).map((tabId) => ({ list, tabId }));
}
