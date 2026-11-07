import { z } from "zod";
import { MAIN_STUDIO_WINDOW } from "@widgetarium/behaviors";
import {
	ClosedTabSchema,
	KeptGroupSchema,
	KeptTabSchema,
	ListEntrySchema,
	PlacedTabsSchema,
} from "../../../shared/schema/tabs.schema.js";
import type { ListEntry, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { isSectionList, tabEntryOf, WORKSPACE_LIST, PINNED_LIST } from "../../../shared/lib/tabs/tab-lists.js";

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
		[PINNED_LIST]: chatEntriesIn(pinnedOf(chatTabs)),
		[WORKSPACE_LIST]: [
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
