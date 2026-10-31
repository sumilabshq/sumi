import { emptyMoment } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import type { HostTab, HostTabsMoment } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import { sidebarOf } from "../packages/state/places/shared/lib/rows/sidebar-rows.ts";
import type { PageFacts } from "../packages/state/places/shared/schema/screen.schema.ts";
import type { PlacedSidebar, SidebarEntry } from "../packages/state/places/shared/schema/tab-rows.schema.ts";

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
		essentialId: null,
		lastAddress: null,
		lastTitle: null,
		lastFavicon: null,
		title: null,
		mark: "none",
		isFolded: false,
	};
}

const MOMENT: HostTabsMoment = {
	...emptyMoment(),
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
		],
		"chat-1": [
			{ kind: "tab", id: "sub" },
			{ kind: "group", id: "g2" },
		],
	},
	groups: [
		{ id: "g1", name: "Work", hue: "blue", isOpen: true, tabIds: ["chat-3"] },
		{ id: "g2", name: "Docs", hue: null, isOpen: true, tabIds: ["loose"] },
	],
};

function sidebarWith(moment: HostTabsMoment, shownTileRowId: string | null): PlacedSidebar {
	return sidebarOf({
		moment,
		essentials: [],
		pages: [pageOf("apart", true), pageOf("sub", false)],
		shownApp: null,
		hasShownTabPane: true,
		elsewhere: [],
		shownTileRowId,
	});
}

function shapeOf(entry: SidebarEntry): string {
	if (entry.kind === "tab") {
		return itemShapeOf(entry);
	}

	if (entry.kind === "split") {
		return `split:${entry.split.id}`;
	}

	return `group:${entry.group.id}[${entry.group.items.map(itemShapeOf).join(",")}]`;
}

function itemShapeOf({ tab, children }: Extract<SidebarEntry, { kind: "tab" }>): string {
	if (children === undefined) {
		return `tab:${tab.id}`;
	}

	return `chat:${tab.id}[${children.map((child) => (child.kind === "tab" ? child.tab.id : `group:${child.group.id}`)).join(",")}]`;
}

const sidebar = sidebarWith(MOMENT, "chat-1");
const shapes = sidebar.sections.map((section) => [section.list, section.entries.map(shapeOf)]);
check(
	"the sidebar is Pinned then Open, and a chat carries its own tabs and groups nested under it",
	JSON.stringify(shapes) ===
		JSON.stringify([
			["pinned", ["chat:chat-2[]"]],
			["workspace", ["chat:chat-1[sub,group:g2]", "group:g1[chat:chat-3[]]", "tab:apart"]],
		]),
	shapes,
);

const openChat = sidebar.sections[1]?.entries[0];
check(
	"the chat on screen is shown, another chat is not",
	openChat?.kind === "tab" &&
		openChat.children !== undefined &&
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

const empty = sidebarWith(emptyMoment(), null);
check(
	"both sections stand even when empty, and a new tab goes to Open",
	JSON.stringify(empty.sections.map((section) => section.list)) === '["pinned","workspace"]' &&
		empty.newTabList === "workspace",
	[empty.sections, empty.newTabList],
);

console.log(`\nsidebar view: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
