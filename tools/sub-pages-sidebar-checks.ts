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
					artifacts: [{ kind: "tab", tab: tabOf("plan", "browser") }],
					isFolded: false,
				},
				{ kind: "tab", tab: tabOf("chat-b", "chat"), artifacts: [], isFolded: false },
				{ kind: "tab", tab: tabOf("page", "browser") },
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

const chatIntoChat = dropOf("chat-a", "chat-b");
check("a chat dropped onto a chat is refused with the old words", chatIntoChat.refused, {
	chatId: "chat-b",
	words: "A chat can't hold a chat",
});

const groupIntoChat = dropOf("group:g", "chat-b");
check("a group dropped onto a chat is refused", groupIntoChat.refused, {
	chatId: "chat-b",
	words: "A chat can't hold a group",
});

check("an artifact can be carried", carriedOf(sidebar, "plan")?.depth, 1);
const artifactOut = arrangedSidebarOf(sidebar, "plan", { targetId: "page", place: "after", levels: -1 });
check("an artifact dragged out of its chat lands in the workspace list, after the page", artifactOut.placed?.to, {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: "g",
});

const shown = arrangedSidebarOf(sidebar, "page", { targetId: "chat-a", place: "into", levels: 0 }).sidebar;
const chatA = shown.sections[0]?.entries[0];
check(
	"the preview shows the dropped page among the chat's artifacts",
	chatA?.kind === "tab" ? chatA.artifacts?.map(({ tab }) => tab.id) : null,
	["plan", "page"],
);

console.log(failed === 0 ? "chat artifacts sidebar: all checks pass" : `chat artifacts sidebar: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
