import type { NamedRecord } from "../schema/chat-facts.schema.js";
import type { TabMark } from "@widgetarium/navigation/lib/shared/schema/tabs.schema";
import { titleOfTab } from "@widgetarium/navigation/lib/shared/lib/rows/tab-face";
import { chatAppOf, isChatTab } from "@widgetarium/navigation/lib/shared/lib/tabs/app-abilities";
import type { PlacedApps } from "@widgetarium/navigation/lib/shared/lib/tabs/app-abilities";
import { chatIdOf } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import type { HostTab, HostTabsMoment, MovedTabs } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import {
	flatTabIdsOf,
	tabEntryOf,
	windowOfList,
	withEntryBefore,
} from "@widgetarium/navigation/lib/shared/lib/tabs/tab-lists";
import type { ChatLists } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-lists";

export interface ChatTabRow {
	readonly id: string;
	readonly title: string;
	readonly mark: TabMark;
}

export interface ChatTabRows {
	readonly open: readonly ChatTabRow[];
}

export function chatTabRowsOf(moment: Pick<HostTabsMoment, "tabs" | "lists" | "groups" | "apps">): ChatTabRows {
	const holderOf = new Map(moment.tabs.filter((tab) => isChatTab(moment.apps, tab)).map((tab) => [tab.id, tab]));
	const rows = Object.keys(moment.lists)
		.filter((listId) => windowOfList(listId) !== null)
		.flatMap((listId) => flatTabIdsOf(moment, listId))
		.flatMap((id) => {
			const holder = holderOf.get(id);
			return holder === undefined ? [] : [chatTabRowOf(moment.apps, holder)];
		});
	return {
		open: rows.filter((row, at) => rows.findIndex(({ id }) => id === row.id) === at),
	};
}

export function keepChatTabs(moment: HostTabsMoment, chats: readonly NamedRecord[], listId: string): MovedTabs | null {
	const holderApp = chatAppOf(moment.apps);
	const missing = holderApp === null ? [] : chatsWithNoTab(moment, chats);
	const renamed = chats.filter((chat) => isRenamed(moment, chat));

	if (missing.length === 0 && renamed.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			lists: withChatsAtEnd(moment.lists, missing, listId),
			tabs: [...withTitles(moment, renamed), ...missing.map((chat) => chatTabOf(holderApp ?? "", chat))],
		},
		reason: keptSaid(missing, renamed, listId),
	};
}

function chatsWithNoTab(moment: HostTabsMoment, chats: readonly NamedRecord[]): readonly NamedRecord[] {
	const known = new Set(
		[...moment.tabs, ...moment.closed.map((closed) => closed.tab), ...moment.sessions.flatMap((session) => session.tabs)].map(
			(tab) => chatIdOf(moment.apps, tab) ?? tab.id,
		),
	);
	return chats.filter((chat) => !known.has(chat.id));
}

function chatTabRowOf(apps: PlacedApps, tab: HostTab): ChatTabRow {
	return {
		id: chatIdOf(apps, tab) ?? tab.id,
		title: titleOfTab(apps, tab),
		mark: tab.mark,
	};
}

function isRenamed(moment: HostTabsMoment, chat: NamedRecord): boolean {
	return chat.title !== null && linkedTabsOf(moment, chat.id).some((tab) => tab.title !== chat.title);
}

export function linkedTabsOf(moment: Pick<HostTabsMoment, "tabs" | "apps">, chatId: string): readonly HostTab[] {
	return moment.tabs.filter((tab) => chatIdOf(moment.apps, tab) === chatId);
}

function withTitles(moment: HostTabsMoment, renamed: readonly NamedRecord[]): readonly HostTab[] {
	const titleOf = new Map(renamed.map((chat) => [chat.id, chat.title]));
	return moment.tabs.map((tab) => {
		const title = titleOf.get(chatIdOf(moment.apps, tab) ?? tab.id);
		return title === undefined ? tab : { ...tab, title };
	});
}

function keptSaid(missing: readonly NamedRecord[], renamed: readonly NamedRecord[], listId: string): string {
	const kept =
		missing.length === 0 ? [] : [`chat tabs ${missing.map(({ id }) => id).join(", ")} kept at the end of ${listId}`];
	const titled = renamed.length === 0 ? [] : [`titles of ${renamed.map(({ id }) => id).join(", ")} follow their chats`];
	return [...kept, ...titled].join("; ");
}

function withChatsAtEnd(lists: ChatLists, chats: readonly NamedRecord[], listId: string): ChatLists {
	return chats.reduce((placed, { id }) => withEntryBefore(placed, listId, tabEntryOf(id), null), lists);
}

function chatTabOf(app: string, { id, title }: NamedRecord): HostTab {
	return {
		id,
		app,
		pageId: null,
		label: null,
		lastAddress: null,
		title,
		mark: "none",
	};
}
