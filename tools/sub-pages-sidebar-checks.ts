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
	const { placed } = arrangedSidebarOf(sidebar, id, { targetId, place: "into", levels: 0 });
	return { placed, refused: refusedDropOf(sidebar, carriedOf(sidebar, id), placed) };
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
	pageId: "page",
	words: "A page with sub-pages can't be a sub-page",
});

const groupIntoChat = dropOf("group:g", "chat-b");
check("a group dropped onto a page is refused", groupIntoChat.refused, {
	pageId: "chat-b",
	words: "A page can't hold a group",
});

check("a sub-page can be carried", carriedOf(sidebar, "plan")?.depth, 1);
const subPageOut = arrangedSidebarOf(sidebar, "plan", { targetId: "page", place: "after", levels: -1 });
check("a sub-page dragged out of its page lands in the workspace list, after the page", subPageOut.placed?.to, {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: "g",
});

const shown = arrangedSidebarOf(sidebar, "page", { targetId: "chat-a", place: "into", levels: 0 }).sidebar;
const chatA = shown.sections[0]?.entries[0];
check(
	"the preview shows the dropped page among the chat's sub-pages",
	chatA?.kind === "tab" ? chatA.subPages?.map(({ tab }) => tab.id) : null,
	["plan", "page"],
);

console.log(failed === 0 ? "sub-pages sidebar: all checks pass" : `sub-pages sidebar: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
