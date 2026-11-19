import { workspaceStateOf } from "../plugins/apps/data/tabs/features/workspace/lib/workspace-state.ts";
import type { StateSources } from "../plugins/apps/data/tabs/features/workspace/lib/workspace-state.ts";

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
		mark: "none" as const,
		isShown,
		isTearable: true,
	};
}

function row(id: string, title: string, isShown = false) {
	return { kind: "tab" as const, tab: tab(id, title, isShown), isChat: false };
}

function chat(id: string, title: string) {
	const face = { ...tab(id, title), app: "chat" as const, icon: "chat" as const, address: null };
	return { kind: "tab" as const, tab: face, isChat: true };
}

const sidebar: StateSources["sidebar"] = {
	sections: [
		{
			list: "workspace",
			title: "Open",
			entries: [
				row("t1", "Linear"),
				chat("chat-a", "Pane bugs"),
				row("t2", "localhost", true),
				{
					kind: "group",
					group: { id: "g1", name: "Docs", hue: "blue", isOpen: false, items: [row("t3", "Tauri docs")] },
				},
			],
		},
	],
	newTabList: "workspace",
};

const chats: StateSources["chats"] = {
	recents: [{ id: "chat-a", title: "Pane bugs", mark: "running" }],
};

const tabs: StateSources["tabs"] = { tabs: [tab("t1", "Linear"), tab("t2", "localhost", true)], canReopen: false };

const whole = workspaceStateOf({ sidebar, chats, tabs }, "chat-a");
check("the asking chat is named", whole.thisChat, "chat-a");
check(
	"every chat is listed, this chat marked",
	whole.chats.map((chat) => [chat.id, chat.isThisChat]),
	[["chat-a", true]],
);
check(
	"the state lists the one tab list, a chat as a tab of app chat",
	whole.sections.map((section) => [
		section.list,
		section.entries.map((entry) => `${entry.kind}:${entry.id}:${entry.kind === "tab" ? entry.app : ""}`),
	]),
	[["workspace", ["tab:t1:browser", "tab:chat-a:chat", "tab:t2:browser", "group:g1:"]]],
);
check("groups keep their tabs and colour", whole.sections[0]?.entries[3], {
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
			subPages: [],
		},
	],
});
check("the tab the person sees is named", whole.shownTab, "t2");

if (failed > 0) {
	console.log(`${failed} agent tool check(s) failed`);
	process.exit(1);
}
console.log("all agent tool checks hold");
