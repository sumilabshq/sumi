import type {
	AppTabState,
	TabsSidebar,
} from "../plugins/tabs/navigation/data/app-host/shared/schema/app-tab.schema.ts";
import {
	arrangedSidebarOf,
	carriedOf,
} from "../plugins/tabs/tabs-sidebar/src/features/tabs-sidebar/lib/arranged-sidebar.ts";
import { refusedDropOf } from "../plugins/tabs/tabs-sidebar/src/features/tabs-sidebar/lib/drop-refusals.ts";

let failed = 0;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);
	failed += isOk ? 0 : 1;
	console.log(
		`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

function tabOf(id: string, app: string): AppTabState {
	return {
		id,
		app,
		title: id,
		subtitle: null,
		icon: app === "chat" ? "chat" : "browser",
		favicon: null,
		status: null,
		label: null,
		address: null,
		isInOwnWindow: false,
		mark: "none",
		isShown: false,
	};
}

const sidebar: TabsSidebar = {
	newTabList: "workspace",
	sections: [
		{
			list: "workspace",
			title: "Recents",
			entries: [
				{
					kind: "tab",
					tab: tabOf("chat-a", "chat"),
					subPages: [{ kind: "tab", tab: tabOf("plan", "browser") }],
					isFolded: false,
				},
				{ kind: "tab", tab: tabOf("chat-b", "chat"), subPages: [], isFolded: false },
				{ kind: "tab", tab: tabOf("page", "browser"), subPages: [], isFolded: false },
				{
					kind: "split",
					split: {
						id: "s1",
						isShown: false,
						map: { cells: [], markedId: "left" },
						members: [
							{ item: { kind: "tab", tab: tabOf("left", "browser"), subPages: [], isFolded: false }, isFocused: true },
							{
								item: { kind: "tab", tab: tabOf("right", "browser"), subPages: [], isFolded: false },
								isFocused: false,
							},
						],
					},
				},
				{
					kind: "group",
					group: {
						id: "g",
						name: "G",
						hue: null,
						isOpen: true,
						items: [{ kind: "tab", tab: tabOf("inner", "browser") }],
					},
				},
			],
		},
	],
};

function dropOf(id: string, targetId: string) {
	const { placed, holder } = arrangedSidebarOf(sidebar, id, { targetId, place: "into", levels: 0 });
	return { placed, refused: refusedDropOf(sidebar, carriedOf(sidebar, id), holder) };
}

const pageIntoChat = dropOf("page", "chat-b");
check("a page dropped onto a chat goes into the chat's list", pageIntoChat.placed?.to, {
	kind: "list",
	list: "chat-b",
	groupId: null,
	before: null,
});
check("a page dropped onto a chat is not refused", pageIntoChat.refused, null);

const chatIntoChat = dropOf("chat-b", "page");
check("a chat with no sub-pages dropped onto a page becomes its sub-page", chatIntoChat.refused, null);
const pageWithSubPages = dropOf("chat-a", "page");
check("a page with sub-pages dropped onto a page is refused", pageWithSubPages.refused, {
	anchorId: "page",
	words: "A page with sub-pages can't be a sub-page",
});

const groupIntoChat = dropOf("group:g", "chat-b");
check("a group dropped onto a page is refused", groupIntoChat.refused, {
	anchorId: "chat-b",
	words: "A page can't hold a group",
});

check("a sub-page can be carried", carriedOf(sidebar, "plan")?.depth, 1);
const subPageOut = arrangedSidebarOf(sidebar, "plan", { targetId: "page", place: "after", levels: -1 });
check("a sub-page dragged out of its page lands in the workspace list, after the page", subPageOut.placed?.to, {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: "left",
});

const shown = arrangedSidebarOf(sidebar, "page", { targetId: "chat-a", place: "into", levels: 0 }).sidebar;
const chatA = shown.sections[0]?.entries[0];
check(
	"the preview shows the dropped page among the chat's sub-pages",
	chatA?.kind === "tab" ? chatA.subPages?.map(({ tab }) => tab.id) : null,
	["plan", "page"],
);

const splitIntoGroup = dropOf("split:s1", "group:g");
check("a split dropped into a group moves there whole", splitIntoGroup.placed, {
	kind: "split",
	id: "s1",
	to: { list: "workspace", groupId: "g", before: null },
});
const splitOntoPage = dropOf("split:s1", "chat-b");
check(
	"a split dropped onto a page is not refused: it unsplits there",
	[splitOntoPage.refused, splitOntoPage.placed?.to],
	[null, { list: "chat-b", groupId: null, before: null }],
);
check("a group dropped onto a split is refused", dropOf("group:g", "split:s1").refused, {
	anchorId: "split:s1",
	words: "A split can't hold a group",
});
check(
	"a split carried in the list moves up as one row",
	arrangedSidebarOf(sidebar, "split:s1", { targetId: "chat-a", place: "before", levels: 0 }).placed,
	{
		kind: "split",
		id: "s1",
		to: { list: "workspace", groupId: null, before: "chat-a" },
	},
);

console.log(failed === 0 ? "sub-pages sidebar: all checks pass" : `sub-pages sidebar: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
