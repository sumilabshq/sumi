import { z } from "zod";
import { MAIN_STUDIO_WINDOW, isPlacesWindowOfWorkspace, placesWindowOf } from "@widgetarium/behaviors";
import {
	ClosedTabSchema,
	KeptGroupSchema,
	KeptTabSchema,
	ListEntrySchema,
	PlacedTabsSchema,
} from "../../../shared/schema/tabs.schema.js";
import type { ListEntry, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import {
	isSectionList,
	tabEntryOf,
	windowListOf,
	windowOfList,
	windowSectionOf,
	WORKSPACE_LIST,
	PINNED_LIST,
} from "../../../shared/lib/tabs/tab-lists.js";

export const KeptSessionTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)).nullable().default(null),
	groups: z.array(KeptGroupSchema).default([]),
	shownId: z.string().nullable(),
	lastShown: z.record(z.string(), z.string()).default({}),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
});

export type KeptSessionTabs = z.infer<typeof KeptSessionTabsSchema>;

export const KeptSessionDocSchema = z.looseObject({
	tabs: KeptSessionTabsSchema.nullable().catch(null),
});

export type KeptSessionDoc = z.infer<typeof KeptSessionDocSchema>;

export const KeptChatEntrySchema = z.looseObject({
	id: z.string().min(1),
	isPinned: z.boolean().catch(false),
	pinRank: z.number().optional().catch(undefined),
	lastAt: z.number().catch(0),
});

export type KeptChatEntry = z.infer<typeof KeptChatEntrySchema>;

export const KeptChatsReadSchema = z.looseObject({
	chats: z.array(z.unknown()).catch([]),
});

export type KeptChatsRead = z.infer<typeof KeptChatsReadSchema>;

export function chatEntriesOf(read: KeptChatsRead): readonly KeptChatEntry[] {
	return read.chats.flatMap((entry) => {
		const parsed = KeptChatEntrySchema.safeParse(entry);
		return parsed.success ? [parsed.data] : [];
	});
}

type KeptLists = Readonly<Record<string, readonly ListEntry[]>>;

const MAIN_OPEN = windowListOf(MAIN_STUDIO_WINDOW, WORKSPACE_LIST);

const MAIN_PINNED = windowListOf(MAIN_STUDIO_WINDOW, PINNED_LIST);

export interface ReshapedTabs {
	readonly placed: PlacedTabs;
	readonly reason: string;
}

export function workspacedTabsOf(workspaceId: string): (placed: PlacedTabs) => ReshapedTabs | null {
	return (placed) => {
		const keyOf = (window: string): string =>
			isPlacesWindowOfWorkspace(window) ? window : placesWindowOf(window, workspaceId);
		const listOf = (listId: string): string => {
			const window = windowOfList(listId);
			const section = windowSectionOf(listId);
			return window === null || section === null ? listId : windowListOf(keyOf(window), section);
		};
		const windows = [
			...new Set([
				...Object.keys(placed.views),
				...Object.keys(placed.lists).flatMap((listId) => windowOfList(listId) ?? []),
				...placed.tabs.flatMap((tab) => tab.essentialWindow ?? []),
			]),
		].filter((window) => !isPlacesWindowOfWorkspace(window));

		if (windows.length === 0) {
			return null;
		}

		return {
			placed: {
				...placed,
				lists: Object.entries(placed.lists).reduce<KeptLists>((merged, [listId, entries]) => {
					const to = listOf(listId);
					const held = merged[to] ?? [];
					const heldIds = new Set(held.map((entry) => entry.id));
					return { ...merged, [to]: [...held, ...entries.filter((entry) => !heldIds.has(entry.id))] };
				}, {}),
				views: Object.fromEntries(
					Object.entries(placed.views).filter(([window]) => placed.views[keyOf(window)] === undefined || isPlacesWindowOfWorkspace(window)).map(([window, view]) => [keyOf(window), view]),
				),
				tabs: placed.tabs.map((tab) =>
					tab.essentialWindow === null ? tab : { ...tab, essentialWindow: keyOf(tab.essentialWindow) },
				),
				closed: placed.closed.map((closed) =>
					closed.chatId === null ? closed : { ...closed, chatId: listOf(closed.chatId) },
				),
			},
			reason: `tabs of windows ${windows.join(", ")} → workspace ${workspaceId} (a window keeps its tabs per workspace)`,
		};
	};
}

export function windowedTabsOf(placed: PlacedTabs): ReshapedTabs | null {
	const { [WORKSPACE_LIST]: open, [PINNED_LIST]: pinned, ...rest } = placed.lists;

	if (open === undefined && pinned === undefined) {
		return null;
	}

	return {
		placed: {
			...placed,
			lists: {
				...rest,
				[MAIN_OPEN]: [...(rest[MAIN_OPEN] ?? []), ...(open ?? [])],
				[MAIN_PINNED]: [...(rest[MAIN_PINNED] ?? []), ...(pinned ?? [])],
			},
		},
		reason: `tabs lists workspace and pinned → window ${MAIN_STUDIO_WINDOW} (${open?.length ?? 0} open, ${pinned?.length ?? 0} pinned; tabs belong to a window now)`,
	};
}

const NO_SESSION: KeptSessionTabs = {
	tabs: [],
	lists: null,
	groups: [],
	shownId: null,
	lastShown: {},
	minted: 0,
	closed: [],
};

export function migratedTabsOf(kept: KeptSessionTabs | null, chats: readonly KeptChatEntry[]): PlacedTabs {
	const session = kept ?? NO_SESSION;
	const heldIds = new Set(session.tabs.map((tab) => tab.id));
	const chatTabs = chats.filter((chat) => !heldIds.has(chat.id));
	return PlacedTabsSchema.parse({
		tabs: [...session.tabs, ...chatTabs.map((chat) => ({ id: chat.id, app: "chat", pageId: null, label: null }))],
		lists: migratedListsOf(listsOf(session), chats, chatTabs),
		groups: session.groups,
		views: { [MAIN_STUDIO_WINDOW]: { shownId: session.shownId, lastShown: session.lastShown } },
		minted: session.minted,
		closed: session.closed,
	});
}

export function migrationSaid(session: KeptSessionTabs | null, chats: readonly KeptChatEntry[]): string {
	return `tabs none → ${session?.tabs.length ?? 0} tabs and ${chats.length} chats (migrated from session.json and chats.json)`;
}

function listsOf(session: KeptSessionTabs): KeptLists {
	return (
		session.lists ?? {
			[WORKSPACE_LIST]: session.tabs.filter((tab) => tab.essentialId === null).map((tab) => tabEntryOf(tab.id)),
		}
	);
}

function migratedListsOf(
	lists: KeptLists,
	chats: readonly KeptChatEntry[],
	chatTabs: readonly KeptChatEntry[],
): KeptLists {
	const chatIds = new Set(chats.map((chat) => chat.id));
	return {
		...chatListsOf(lists, chatIds),
		[MAIN_PINNED]: chatEntriesIn(pinnedOf(chatTabs)),
		[MAIN_OPEN]: [
			...chatEntriesIn(openOf(chatTabs)),
			...(lists[WORKSPACE_LIST] ?? []),
			...orphanEntriesOf(lists, chatIds),
		],
	};
}

function chatListsOf(lists: KeptLists, chatIds: ReadonlySet<string>): KeptLists {
	return Object.fromEntries(Object.entries(lists).filter(([list]) => chatIds.has(list)));
}

function orphanEntriesOf(lists: KeptLists, chatIds: ReadonlySet<string>): readonly ListEntry[] {
	return Object.entries(lists)
		.filter(([list]) => !isSectionList(list) && !chatIds.has(list))
		.flatMap(([, entries]) => entries);
}

function pinnedOf(chats: readonly KeptChatEntry[]): readonly KeptChatEntry[] {
	const rankOf = (chat: KeptChatEntry): number => chat.pinRank ?? Number.MAX_SAFE_INTEGER;
	return chats
		.filter((chat) => chat.isPinned)
		.sort((one, other) => rankOf(one) - rankOf(other) || other.lastAt - one.lastAt);
}

function openOf(chats: readonly KeptChatEntry[]): readonly KeptChatEntry[] {
	return chats.filter((chat) => !chat.isPinned).sort((one, other) => other.lastAt - one.lastAt);
}

function chatEntriesIn(chats: readonly KeptChatEntry[]): readonly ListEntry[] {
	return chats.map((chat) => tabEntryOf(chat.id));
}
