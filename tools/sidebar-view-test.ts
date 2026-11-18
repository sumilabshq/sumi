import { BARE_SCREEN } from "./places-fixture.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { emptyMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import type { HostTab, HostTabsMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { sidebarOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/rows/sidebar-rows.ts";
import type { PageFacts, Screen } from "../plugins/tabs/navigation/data/navigation/shared/schema/screen.schema.ts";
import { selectedIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/rows/tab-rows.ts";
import { tabFactsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/tab-facts.ts";
import type { PlacedSidebar, SidebarEntry } from "../plugins/tabs/navigation/data/navigation/shared/schema/tab-rows.schema.ts";

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — saw ${JSON.stringify(got)}`}`);
}

function pageOf(pageId: string, isInOwnWindow: boolean): PageFacts {
	return {
		pageId,
		title: pageId,
		url: `https://example.com/${pageId}`,
		favicon: null,
		isInkReading: false,
		isAskWaiting: false,
		isClosedToInk: false,
		isInOwnWindow,
	};
}

function tabOf(id: string, app: HostTab["app"]): HostTab {
	return {
		id,
		app,
		pageId: app === "browser" ? id : null,
		label: null,
		lastAddress: null,
		title: null,
		mark: "none",
	};
}

const MOMENT: HostTabsMoment = {
	...emptyMoment(BUILT_IN_APPS),
	tabs: [
		tabOf("chat-1", "chat"),
		tabOf("chat-2", "chat"),
		tabOf("chat-3", "chat"),
		tabOf("apart", "browser"),
		tabOf("sub", "browser"),
		tabOf("loose", "canvas"),
	],
	lists: {
		pinned: [{ kind: "tab", id: "chat-2" }],
		workspace: [
			{ kind: "tab", id: "chat-1" },
			{ kind: "group", id: "g1" },
			{ kind: "tab", id: "apart" },
			{ kind: "tab", id: "sub" },
			{ kind: "group", id: "g2" },
		],
	},
	groups: [
		{ id: "g1", name: "Work", hue: "blue", isOpen: true, entries: [{ kind: "tab", id: "chat-3" }] },
		{ id: "g2", name: "Docs", hue: null, isOpen: true, entries: [{ kind: "tab", id: "loose" }] },
	],
};

function createScreenWithChats(chatIds: readonly string[]): Screen {
	return {
		...BARE_SCREEN,
		shownTabPaneId: "pane-shown",
		chatGroups: chatIds.map((chatId) => ({ chatId, paneIds: [`pane-${chatId}`] })),
	};
}

function sidebarWith(moment: HostTabsMoment, selectedId: string | null): PlacedSidebar {
	const selected = { ...moment, selectedId };
	return sidebarOf({
		moment: selected,
		pages: [pageOf("apart", true), pageOf("sub", false)],
		highlightedIds: selectedIdsOf(selected, tabFactsOf(createScreenWithChats(selectedId === null ? [] : [selectedId]))),
		elsewhere: [],
	});
}

function shapeOf(entry: SidebarEntry): string {
	if (entry.kind === "tab") {
		return itemShapeOf(entry);
	}

	if (entry.kind === "split") {
		return `split:${entry.split.id}`;
	}

	return `group:${entry.group.id}[${entry.group.items.map(shapeOf).join(",")}]`;
}

function itemShapeOf({ tab }: Extract<SidebarEntry, { kind: "tab" }>): string {
	return `${tab.app === "chat" ? "chat" : "tab"}:${tab.id}`;
}

const sidebar = sidebarWith(MOMENT, "chat-1");
const shapes = sidebar.sections.map((section) => [section.list, section.entries.map(shapeOf)]);
check(
	"the sidebar is Pinned then Open, and a chat is a plain row that holds no tabs",
	JSON.stringify(shapes) ===
		JSON.stringify([
			["pinned", ["chat:chat-2"]],
			["workspace", ["chat:chat-1", "group:g1[chat:chat-3]", "tab:apart", "tab:sub", "group:g2[tab:loose]"]],
		]),
	shapes,
);

const openChat = sidebar.sections[1]?.entries[0];
check(
	"the chat on screen is shown, another chat is not",
	openChat?.kind === "tab" &&
		openChat.tab.app === "chat" &&
		openChat.tab.isShown &&
		sidebar.sections[0]?.entries[0]?.kind === "tab" &&
		!sidebar.sections[0].entries[0].tab.isShown,
	sidebar.sections.map((section) => section.entries.map((entry) => entry.kind === "tab" && entry.tab.isShown)),
);

const apart = sidebar.sections[1]?.entries[2];
check(
	"a tab whose page stands in its own window is still listed and says so",
	apart?.kind === "tab" && apart.tab.isInOwnWindow,
	apart,
);

const empty = sidebarWith(emptyMoment(BUILT_IN_APPS), null);
check(
	"both sections stand even when empty, and a new tab goes to Open",
	JSON.stringify(empty.sections.map((section) => section.list)) === '["pinned","workspace"]' &&
		empty.newTabList === "workspace",
	[empty.sections, empty.newTabList],
);

console.log(`\nsidebar view: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
