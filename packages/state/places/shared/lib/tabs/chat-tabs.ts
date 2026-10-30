import type { NamedRecord } from "../../schema/tab-facts.schema.js";
import type { TabMark } from "../../schema/tabs.schema.js";
import { recordTitleOf } from "../rows/app-labels.js";
import { holdsTabs } from "./app-abilities.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "./host-tabs.js";
import { placeTab } from "./host-tabs.js";
import { PINNED_LIST, WORKSPACE_LIST, flatTabIdsOf, locationOf, tabEntryOf, withEntryBefore } from "./tab-lists.js";
import type { ChatLists } from "./tab-lists.js";

export interface ChatTabRow {
	readonly id: string;
	readonly title: string;
	readonly mark: TabMark;
}

export interface ChatTabRows {
	readonly pinned: readonly ChatTabRow[];
	readonly open: readonly ChatTabRow[];
}

export function chatTabRowsOf(moment: Pick<HostTabsMoment, "tabs" | "lists" | "groups">): ChatTabRows {
	const holderOf = new Map(moment.tabs.filter(holdsTabs).map((tab) => [tab.id, tab]));
	const rowsIn = (listId: string): readonly ChatTabRow[] =>
		flatTabIdsOf(moment, listId).flatMap((id) => {
			const holder = holderOf.get(id);
			return holder === undefined ? [] : [chatTabRowOf(holder)];
		});
	return {
		pinned: rowsIn(PINNED_LIST),
		open: rowsIn(WORKSPACE_LIST),
	};
}

export function pinTab(moment: HostTabsMoment, id: string, isPinned: boolean): MovedTabs | null {
	const location = locationOf(moment, id);
	const target = isPinned ? PINNED_LIST : WORKSPACE_LIST;

	if (location?.chatId === target) {
		return null;
	}

	const first = moment.lists[WORKSPACE_LIST]?.[0]?.id ?? null;
	return placeTab(moment, id, {
		chatId: target,
		groupId: null,
		before: isPinned ? null : first,
	});
}

export function keepChatTabs(moment: HostTabsMoment, chats: readonly NamedRecord[]): MovedTabs | null {
	const missing = chatsWithNoTab(moment, chats);
	const renamed = chats.filter((chat) => isRenamed(moment, chat));

	if (missing.length === 0 && renamed.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			lists: withChatsOnTop(moment.lists, missing),
			tabs: [...withTitles(moment.tabs, renamed), ...missing.map(chatTabOf)],
		},
		reason: keptSaid(missing, renamed),
	};
}

function chatsWithNoTab(moment: HostTabsMoment, chats: readonly NamedRecord[]): readonly NamedRecord[] {
	const known = new Set([...moment.tabs, ...moment.closed.map((closed) => closed.tab)].map((tab) => tab.id));
	return chats.filter((chat) => !known.has(chat.id));
}

function chatTabRowOf(tab: HostTab): ChatTabRow {
	return {
		id: tab.id,
		title: recordTitleOf(tab),
		mark: tab.mark,
	};
}

function isRenamed(moment: HostTabsMoment, chat: NamedRecord): boolean {
	const tab = moment.tabs.find((held) => held.id === chat.id);
	return tab !== undefined && chat.title !== null && tab.title !== chat.title;
}

function withTitles(tabs: readonly HostTab[], renamed: readonly NamedRecord[]): readonly HostTab[] {
	const titleOf = new Map(renamed.map((chat) => [chat.id, chat.title]));
	return tabs.map((tab) => {
		const title = titleOf.get(tab.id);
		return title === undefined ? tab : { ...tab, title };
	});
}

function keptSaid(missing: readonly NamedRecord[], renamed: readonly NamedRecord[]): string {
	const kept = missing.length === 0 ? [] : [`chat tabs ${missing.map(({ id }) => id).join(", ")} kept on top of Open`];
	const titled = renamed.length === 0 ? [] : [`titles of ${renamed.map(({ id }) => id).join(", ")} follow their chats`];
	return [...kept, ...titled].join("; ");
}

function withChatsOnTop(lists: ChatLists, chats: readonly NamedRecord[]): ChatLists {
	return [...chats]
		.reverse()
		.reduce(
			(placed, { id }) =>
				withEntryBefore(placed, WORKSPACE_LIST, tabEntryOf(id), placed[WORKSPACE_LIST]?.[0]?.id ?? null),
			lists,
		);
}

function chatTabOf({ id, title }: NamedRecord): HostTab {
	return {
		id,
		app: "chat",
		pageId: null,
		label: null,
		essentialId: null,
		lastAddress: null,
		lastTitle: null,
		lastFavicon: null,
		title,
		mark: "none",
		isFolded: false,
	};
}
