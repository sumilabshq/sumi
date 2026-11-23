import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type {
	ListEntry,
	PlacedTabs,
	TabMark,
} from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";

export const MAIN_WINDOW = "main@fixture";

const CHAT_COUNT = 22;
const SUB_PAGES_PER_CHAT = [1, 1, 3, 2, 4, 1, 1, 6, 1];
const LOOSE_CHATS = 16;

export const chatIdOf = (at: number): string => `chat-${String(at).padStart(2, "0")}`;

const tabEntry = (id: string): ListEntry => ({ kind: "tab", id });

const groupEntry = (id: string): ListEntry => ({ kind: "group", id });

function tabOf(id: string, app: string, mark: TabMark = "none"): PlacedTabs["tabs"][number] {
	return {
		id,
		app,
		pageId: null,
		label: null,
		lastAddress: null,
		title: `Title of ${id}`,
		mark,
	};
}

function chatsOf(): PlacedTabs["tabs"] {
	return Array.from({ length: CHAT_COUNT }, (_, at) => tabOf(chatIdOf(at + 1), "chat", markOfChat(at + 1)));
}

function markOfChat(at: number): TabMark {
	if (at === 2) {
		return "unread";
	}

	return at === 3 ? "running" : "none";
}

function subPagesOf(): { readonly tabs: PlacedTabs["tabs"]; readonly lists: Record<string, ListEntry[]> } {
	const tabs: PlacedTabs["tabs"][number][] = [];
	const lists: Record<string, ListEntry[]> = {};

	SUB_PAGES_PER_CHAT.forEach((count, at) => {
		const chatId = chatIdOf(at + 1);
		const ids = Array.from({ length: count }, (_, page) => `sub-${at + 1}-${page + 1}`);
		tabs.push(...ids.map((id) => tabOf(id, page(id))));
		lists[chatId] = ids.map(tabEntry);
	});

	return { tabs, lists };
}

function page(id: string): string {
	return id.endsWith("-1") ? "canvas" : "markdown-viewer";
}

function groupsOf(): PlacedTabs["groups"] {
	return [
		{ id: "group-89", name: "Empty group", hue: "orange", isOpen: false, entries: [] },
		{ id: "group-90", name: "MCP", hue: "blue", isOpen: false, entries: [tabEntry(chatIdOf(17)), tabEntry("tab-84")] },
		{
			id: "group-93",
			name: "Refactoring",
			hue: null,
			isOpen: true,
			entries: [tabEntry(chatIdOf(18)), tabEntry("tab-94"), tabEntry("tab-95")],
		},
		{
			id: "group-99",
			name: "Three chats",
			hue: null,
			isOpen: false,
			entries: [tabEntry(chatIdOf(19)), tabEntry(chatIdOf(20)), tabEntry(chatIdOf(21))],
		},
		{ id: "group-147", name: "One chat", hue: null, isOpen: false, entries: [tabEntry(chatIdOf(22))] },
	];
}

function workspaceListOf(): ListEntry[] {
	const loose = Array.from({ length: LOOSE_CHATS }, (_, at) => tabEntry(chatIdOf(at + 1)));
	return [
		...loose.slice(0, 4),
		groupEntry("group-89"),
		...loose.slice(4, 8),
		groupEntry("group-90"),
		groupEntry("group-93"),
		...loose.slice(8),
		groupEntry("group-99"),
		groupEntry("group-147"),
	];
}

function paneTreeOf(): unknown {
	const leaf = (id: string, chatId: string): unknown => ({ kind: "pane", id, view: { kind: "chat", chatId } });
	const appLeaf = (id: string, tabId: string): unknown => ({ kind: "pane", id, view: { kind: "app", tabId } });
	const row = (id: string, chatId: string, children: unknown[], shares: number[]): unknown => ({
		kind: "split",
		id,
		dir: "row",
		chatId,
		children,
		shares,
	});
	return {
		root: row("pane-1-group", chatIdOf(1), [leaf("pane-1", chatIdOf(1))], [1]),
		minted: 9,
		targetId: null,
		chatTargetId: "pane-1",
		shelved: {
			[chatIdOf(3)]: row(
				"pane-3-group",
				chatIdOf(3),
				[leaf("pane-3", chatIdOf(3)), appLeaf("pane-31", "sub-3-2"), appLeaf("pane-32", "sub-1-1")],
				[0.5, 0.3, 0.2],
			),
			[chatIdOf(5)]: row(
				"pane-5-group",
				chatIdOf(5),
				[leaf("pane-5", chatIdOf(5)), appLeaf("pane-51", "sub-5-1")],
				[0.6, 0.4],
			),
		},
	};
}

export function fixturePlaced(): PlacedTabs {
	const sub = subPagesOf();
	const tabs = [
		...chatsOf(),
		...sub.tabs,
		tabOf("tab-84", "canvas"),
		tabOf("tab-94", "markdown-viewer"),
		tabOf("tab-95", "canvas"),
	];
	return PlacedTabsSchema.parse({
		tabs,
		lists: { workspace: workspaceListOf(), ...sub.lists },
		groups: groupsOf(),
		views: {
			[MAIN_WINDOW]: {
				shownId: "tab-84",
				panes: paneTreeOf(),
			},
		},
		sessions: [],
		minted: 200,
		closed: [],
		splits: [],
		windows: [],
	});
}

export type FixtureMutation = "tab-twice" | "tab-nowhere" | "dangling-entry";

export function mutatedPlaced(mutation: FixtureMutation): PlacedTabs {
	const placed = fixturePlaced();

	if (mutation === "tab-twice") {
		return { ...placed, lists: { ...placed.lists, [chatIdOf(2)]: [tabEntry("sub-1-1")] } };
	}

	if (mutation === "tab-nowhere") {
		return { ...placed, lists: { ...placed.lists, [chatIdOf(1)]: [] } };
	}

	return { ...placed, lists: { ...placed.lists, [chatIdOf(2)]: [tabEntry("tab-ghost")] } };
}
