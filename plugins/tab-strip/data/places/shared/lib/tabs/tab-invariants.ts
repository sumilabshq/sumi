import type { ListEntry } from "../../schema/tabs.schema.js";
import type { HostTabsMoment } from "./host-tabs-moment.js";
import { findGroup, isSectionList } from "./tab-lists.js";

const LIST_OF_NO_WINDOW = 'the list "{list}" belongs to no window: only a window owns a list';
const REFUSED_STANDING = 'the tab "{id}" cannot stand inside "{list}": a tab stands only in the list of a window';
const NOT_ONE_PLACE = 'the tab "{id}" stands in {count} places: a tab stands in exactly one list';
const UNKNOWN_ENTRY = 'the list "{list}" names "{id}", which is no tab or group here';
const GROUP_NOT_ONE_LIST = 'the group "{id}" stands in {count} lists: a group stands in exactly one';

interface Standing {
	readonly list: string;
	readonly tabId: string;
}

type TabLaws = Pick<HostTabsMoment, "tabs" | "lists" | "groups">;

export function refuseStanding(tab: { readonly id: string }, list: string): string | null {
	return isSectionList(list) ? null : REFUSED_STANDING.replace("{id}", tab.id).replace("{list}", list);
}

export function tabBreaksOf(moment: TabLaws): readonly string[] {
	return [
		...listsOfNoWindow(moment),
		...unknownEntries(moment),
		...groupsNotInOneList(moment),
		...tabsStandingRefused(moment),
		...tabsNotInOnePlace(moment),
	];
}

function listsOfNoWindow(moment: TabLaws): readonly string[] {
	return Object.keys(moment.lists)
		.filter((list) => !isSectionList(list))
		.map((list) => LIST_OF_NO_WINDOW.replace("{list}", list));
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

function tabsStandingRefused(moment: TabLaws): readonly string[] {
	const tabOf = new Map(moment.tabs.map((tab) => [tab.id, tab]));
	return standingsOf(moment).flatMap(({ list, tabId }) => {
		const tab = tabOf.get(tabId);
		const refusal = tab === undefined ? null : refuseStanding(tab, list);
		return refusal === null ? [] : [refusal];
	});
}

function tabsNotInOnePlace(moment: TabLaws): readonly string[] {
	const standings = standingsOf(moment);
	const countOf = (id: string): number => standings.filter((standing) => standing.tabId === id).length;
	return moment.tabs
		.filter((tab) => countOf(tab.id) !== 1)
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
