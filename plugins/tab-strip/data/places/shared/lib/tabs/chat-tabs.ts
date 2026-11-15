import type { NamedRecord } from "../../schema/tab-facts.schema.js";
import type { TabMark } from "../../schema/tabs.schema.js";
import { titleOfTab } from "../rows/tab-face.js";
import { chatAppOf, isChatTab } from "./app-abilities.js";
import type { PlacedApps } from "./app-abilities.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "./host-tabs.js";
import {
	flatTabIdsOf,
	tabEntryOf,
	windowOfList,
	withEntryBefore,
} from "./tab-lists.js";
import type { ChatLists } from "./tab-lists.js";

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
	return {
		open: Object.keys(moment.lists)
			.filter((listId) => windowOfList(listId) !== null)
			.flatMap((listId) => flatTabIdsOf(moment, listId))
			.flatMap((id) => {
				const holder = holderOf.get(id);
				return holder === undefined ? [] : [chatTabRowOf(moment.apps, holder)];
			}),
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
			lists: withChatsOnTop(moment.lists, missing, listId),
			tabs: [...withTitles(moment.tabs, renamed), ...missing.map((chat) => chatTabOf(holderApp ?? "", chat))],
		},
		reason: keptSaid(missing, renamed, listId),
	};
}

function chatsWithNoTab(moment: HostTabsMoment, chats: readonly NamedRecord[]): readonly NamedRecord[] {
	const known = new Set(
		[...moment.tabs, ...moment.closed.map((closed) => closed.tab), ...moment.sessions.flatMap((session) => session.tabs)].map(
			(tab) => tab.id,
		),
	);
	return chats.filter((chat) => !known.has(chat.id));
}

function chatTabRowOf(apps: PlacedApps, tab: HostTab): ChatTabRow {
	return {
		id: tab.id,
		title: titleOfTab(apps, tab),
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

function keptSaid(missing: readonly NamedRecord[], renamed: readonly NamedRecord[], listId: string): string {
	const kept =
		missing.length === 0 ? [] : [`chat tabs ${missing.map(({ id }) => id).join(", ")} kept on top of ${listId}`];
	const titled = renamed.length === 0 ? [] : [`titles of ${renamed.map(({ id }) => id).join(", ")} follow their chats`];
	return [...kept, ...titled].join("; ");
}

function withChatsOnTop(lists: ChatLists, chats: readonly NamedRecord[], listId: string): ChatLists {
	return [...chats]
		.reverse()
		.reduce(
			(placed, { id }) => withEntryBefore(placed, listId, tabEntryOf(id), placed[listId]?.[0]?.id ?? null),
			lists,
		);
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
