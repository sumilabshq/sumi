import { appStateOf } from "../apps/host-tauri/src/agent/app-state.ts";
import type { AppTabs, ChatList, Sidebar } from "../apps/host-tauri/src/agent/app-state.ts";
import type { ChatChild } from "../packages/domain/app-host/generated/contract.ts";

let failed = 0;

function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) {
		failed += 1;
	}
	console.log(
		`${ok ? "OK  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function tab(id: string, title: string, isShown = false) {
	return {
		id,
		app: "browser" as const,
		title,
		subtitle: null,
		icon: "site" as const,
		favicon: null,
		status: null,
		label: null,
		address: `https://${id}.example.com`,
		isInOwnWindow: false,
		isShown,
	};
}

function chat(id: string, title: string, children: readonly ChatChild[]) {
	return { kind: "chat" as const, chat: { id, title, label: null, mark: "none" as const, isShown: false, children } };
}

const sidebar: Sidebar = {
	essentials: [{ id: "e1", title: "Mail", icon: "site", favicon: null, isShown: false, isLive: true }],
	sections: [
		{
			list: "pinned",
			entries: [chat("chat-b", "Billing", [{ kind: "tab", tab: tab("t4", "BILL board") }])],
		},
		{
			list: "workspace",
			entries: [
				{ kind: "tab", tab: tab("t1", "Linear") },
				chat("chat-a", "Pane bugs", [
					{ kind: "tab", tab: tab("t2", "localhost", true) },
					{
						kind: "group",
						group: { id: "g1", name: "Docs", hue: "blue", isOpen: false, tabs: [tab("t3", "Tauri docs")] },
					},
				]),
			],
		},
	],
	newTabList: "chat-a",
};

const chats: ChatList = {
	pinned: [{ id: "chat-b", title: "Billing", isPinned: true, mark: "none" }],
	recents: [{ id: "chat-a", title: "Pane bugs", isPinned: false, mark: "running" }],
};

const tabs: AppTabs = { tabs: [tab("t1", "Linear"), tab("t2", "localhost", true)], canReopen: false };

const whole = appStateOf({ sidebar, chats, tabs }, "chat-a", { scope: "workspace" });
check("the asking chat is named", whole.thisChat, "chat-a");
check(
	"every chat is listed, pinned first, this chat marked",
	whole.chats.map((chat) => [chat.id, chat.isThisChat]),
	[
		["chat-b", false],
		["chat-a", true],
	],
);
check(
	"each section says whose it is",
	whole.sections.map((section) => section.place),
	["pinned", "workspace", "chat:chat-b", "this-chat"],
);
check("groups keep their tabs and colour", whole.sections[3]?.entries[1], {
	kind: "group",
	id: "g1",
	name: "Docs",
	colour: "blue",
	isOpen: false,
	tabs: [
		{
			id: "t3",
			title: "Tauri docs",
			app: "browser",
			address: "https://t3.example.com",
			isShown: false,
			isInOwnWindow: false,
			status: null,
		},
	],
	chats: [],
});
check("the tab the person sees is named", whole.shownTab, "t2");
check("essentials come with the workspace scope", whole.essentials, [{ id: "e1", title: "Mail", isShown: false }]);

const own = appStateOf({ sidebar, chats, tabs }, "chat-a", { scope: "this-chat" });
check(
	"this-chat scope keeps only this chat's section",
	own.sections.map((section) => section.list),
	["chat-a"],
);
check("this-chat scope drops the essentials", own.essentials, []);

const other = appStateOf({ sidebar, chats, tabs }, "chat-b", { scope: "workspace" });
check(
	"the same tabs read from another chat swap places",
	other.sections.map((section) => section.place),
	["pinned", "workspace", "this-chat", "chat:chat-a"],
);

if (failed > 0) {
	console.log(`${failed} agent tool check(s) failed`);
	process.exit(1);
}
console.log("all agent tool checks hold");
