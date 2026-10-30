import type { HostTab, HostTabsMoment, MovedTabs } from "./host-tabs.js";
import { placeTab } from "./host-tabs.js";
import { PINNED_LIST, WORKSPACE_LIST, flatTabIdsOf, locationOf, tabEntryOf, withEntryBefore } from "./tab-lists.js";
import type { ChatLists } from "./tab-lists.js";

export interface ChatTabRow {
	readonly id: string;
	readonly label: string | null;
}

export interface ChatTabRows {
	readonly pinned: readonly ChatTabRow[];
	readonly open: readonly ChatTabRow[];
}

export function chatTabRowsOf(moment: Pick<HostTabsMoment, "tabs" | "lists" | "groups">): ChatTabRows {
	const chatOf = new Map(moment.tabs.filter((tab) => tab.app === "chat").map((tab) => [tab.id, tab]));
	const rowsIn = (listId: string): readonly ChatTabRow[] =>
		flatTabIdsOf(moment, listId).flatMap((id) => {
			const chat = chatOf.get(id);
			return chat === undefined ? [] : [{ id: chat.id, label: chat.label }];
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

export function keepChatTabs(moment: HostTabsMoment, chatIds: readonly string[]): MovedTabs | null {
	const held = new Set(moment.tabs.map((tab) => tab.id));
	const missing = chatIds.filter((id) => !held.has(id));

	if (missing.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			lists: withChatsOnTop(moment.lists, missing),
			tabs: [...moment.tabs, ...missing.map(chatTabOf)],
		},
		reason: `chat tabs ${missing.join(", ")} kept at the top of the open tabs`,
	};
}

function withChatsOnTop(lists: ChatLists, chatIds: readonly string[]): ChatLists {
	return [...chatIds]
		.reverse()
		.reduce(
			(placed, id) => withEntryBefore(placed, WORKSPACE_LIST, tabEntryOf(id), placed[WORKSPACE_LIST]?.[0]?.id ?? null),
			lists,
		);
}

function chatTabOf(id: string): HostTab {
	return {
		id,
		app: "chat",
		pageId: null,
		label: null,
		essentialId: null,
		lastAddress: null,
		lastTitle: null,
		lastFavicon: null,
	};
}
