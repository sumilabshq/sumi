import { appHost as appHostContract } from "../plugins/tabs/navigation/data/app-host/generated/contract.ts";
import { workspaces } from "../packages/domain/workspaces/generated/contract.ts";
import { chatTabs } from "../plugins/ai/chat/data/chat-tabs/generated/contract.ts";
import { FIRST_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { WORKSPACE_LIST } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import type { StudioFakes } from "./app-host-fixture.ts";
import type { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { check, tally } from "./check-helpers.ts";

async function boardChatsOf(studioApp: Runtime): Promise<readonly string[]> {
	const board = await studioApp.send(appHostContract.panes.paneTree);
	return board.ok ? board.output.chatGroups.map((group) => group.chatId) : [];
}

async function chatCountOf(studioApp: Runtime): Promise<number> {
	const list = await studioApp.send(chatTabs.chatList.all);
	return list.ok ? list.output.recents.length : -1;
}

async function namingChecks(): Promise<void> {
	const { studioApp } = studioFakesOf({ tree: FIRST_PANES });
	const first = await studioApp.send(chatTabs.chatOpening.namePane, { paneId: "pane-chat" });
	const again = await studioApp.send(chatTabs.chatOpening.namePane, { paneId: "pane-chat" });
	const asked = await studioApp.send(workspaces.chats.chatToOpen);
	check(
		"an empty chat pane takes the chat asked on start, once, and the ask is spent",
		[
			first.ok ? first.output.id : first.reason,
			again.ok ? again.output.id : again.reason,
			await boardChatsOf(studioApp),
			await chatCountOf(studioApp),
			asked.ok ? asked.output.id : asked.reason,
		],
		[HOST_CHAT, HOST_CHAT, [HOST_CHAT], 1, null],
	);
}

async function unknownChatChecks(): Promise<void> {
	const { studioApp } = studioFakesOf();
	const before = await boardChatsOf(studioApp);
	const opened = await studioApp.send(appHostContract.tabs.showTab, { id: "chat-gone" });
	check(
		"opening a chat that does not exist is refused before the layout changes",
		[opened.ok, await boardChatsOf(studioApp)],
		[false, before],
	);
}

async function tearOffChecks(): Promise<void> {
	const { studioApp, pages } = studioFakesOf();
	const torn = await studioApp.send(appHostContract.tabActions.tearOff, { id: HOST_CHAT });
	check(
		"a chat tears off through the tab command: places closes it on this board, then it opens in its own window",
		[torn.ok, await boardChatsOf(studioApp), pages.calls.at(-1)],
		[true, [], `chat window ${HOST_CHAT}`],
	);
}

async function chatTabChecks(): Promise<void> {
	const { studioApp, places } = studioFakesOf();
	const opened = await studioApp.send(chatTabs.chatOpening.openNew, { title: "Plan" });
	const newId = opened.ok ? opened.output.id : "";
	await studioApp.send(appHostContract.tabActions.renameTab, { id: HOST_CHAT, label: "Renamed" });
	const list = await studioApp.send(chatTabs.chatList.all);
	const placed = await places.placedTabs();
	check(
		"a new chat is a tab in the workspace list, and renaming its tab names the chat",
		[
			list.ok ? list.output.recents.map((row) => [row.id, row.title]).sort() : list.reason,
			placed.lists[WORKSPACE_LIST]?.some((entry) => entry.id === newId),
		],
		[[[HOST_CHAT, "Renamed"], [newId, "Plan"]].sort(), true],
	);
}

interface ChatName {
	readonly chat: string | null;
	readonly by: string | null;
	readonly tabTitle: string | null;
	readonly label: string | null;
}

async function chatNameOf(studioApp: Runtime, places: MemoryTabsGateway): Promise<ChatName> {
	const records = await studioApp.send(workspaces.chats.chatRecords);
	const record = records.ok ? records.output.chats.find(({ id }) => id === HOST_CHAT) : undefined;
	const tab = (await places.placedTabs()).tabs.find(({ id }) => id === HOST_CHAT);
	return {
		chat: record?.title ?? null,
		by: record?.titleBy ?? null,
		tabTitle: tab?.title ?? null,
		label: tab?.label ?? null,
	};
}

async function settledNameOf(fakes: StudioFakes, isMet: (name: ChatName) => boolean): Promise<ChatName> {
	const until = Date.now() + 2000;
	let name = await chatNameOf(fakes.studioApp, fakes.places);

	while (!isMet(name) && Date.now() < until) {
		await new Promise((settled) => setTimeout(settled, 5));
		name = await chatNameOf(fakes.studioApp, fakes.places);
	}

	return name;
}

async function tabNameChecks(): Promise<void> {
	const fakes = studioFakesOf({ chatTitle: "Draft" });
	const { studioApp } = fakes;
	await studioApp.send(appHostContract.tabActions.renameTab, { id: HOST_CHAT, label: "release notes" });
	const named = await settledNameOf(fakes, ({ label }) => label === null);
	const sessions = await studioApp.send(chatTabs.chatList.all);
	check(
		"renaming a chat tab names the chat by the person, and the tab keeps no label of its own",
		[named, sessions.ok ? sessions.output.recents.map((row) => row.title) : sessions.reason],
		[
			{
				chat: "Release notes",
				by: "person",
				tabTitle: "Release notes",
				label: null,
			},
			["Release notes"],
		],
	);

	const auto = await studioApp.send(workspaces.chats.renameChat, { id: HOST_CHAT, title: "Agent idea", by: "auto" });
	check(
		"the agent's naming after the person's tab rename is refused",
		[auto.ok ? auto.output.isRenamed : auto.reason, (await chatNameOf(studioApp, fakes.places)).chat],
		[false, "Release notes"],
	);

	await studioApp.send(workspaces.chats.renameChat, { id: HOST_CHAT, title: "Roadmap", by: "person" });
	check(
		"renaming the chat renames its tab",
		await settledNameOf(fakes, ({ tabTitle }) => tabTitle === "Roadmap"),
		{
			chat: "Roadmap",
			by: "person",
			tabTitle: "Roadmap",
			label: null,
		},
	);

	await studioApp.send(appHostContract.tabActions.renameTab, { id: HOST_CHAT, label: "  " });
	check(
		"an empty tab name leaves the chat its name",
		await settledNameOf(fakes, () => false),
		{
			chat: "Roadmap",
			by: "person",
			tabTitle: "Roadmap",
			label: null,
		},
	);
}

function labeled(places: MemoryTabsGateway, id: string, label: string): Promise<null> {
	return places.movePlacedTabs((now) => ({
		next: {
			...now,
			tabs: now.tabs.map((tab) =>
				tab.id === id
					? {
							...tab,
							label,
						}
					: tab,
			),
		},
		reason: `seed label of ${id}`,
		answer: null,
	}));
}

async function staleLabelChecks(): Promise<void> {
	const fakes = studioFakesOf({ chatTitle: "Draft" });
	const { studioApp, places } = fakes;
	await labeled(places, HOST_CHAT, "Old label");
	await studioApp.send(workspaces.chats.renameChat, { id: HOST_CHAT, title: "Chosen", by: "person" });
	const chosen = await settledNameOf(fakes, ({ label }) => label === null);
	await studioApp.send(appHostContract.tabActions.renameTab, { id: HOST_CHAT, label: "" });
	check(
		"a chat renamed while its tab kept a label takes the tab back: the label goes, a later settle keeps the chat's name",
		[chosen, await settledNameOf(fakes, () => false)],
		[
			{
				chat: "Chosen",
				by: "person",
				tabTitle: "Chosen",
				label: null,
			},
			{
				chat: "Chosen",
				by: "person",
				tabTitle: "Chosen",
				label: null,
			},
		],
	);
}

async function pageTabChecks(): Promise<void> {
	const { studioApp, places } = studioFakesOf({
		chatTitle: "Draft",
		tabs: {
			tabs: [
				{
					id: "tab-web",
					app: "browser",
					pageId: null,
					label: null,
					title: "Docs",
				},
			],
			shownId: null,
			minted: 1,
			closed: [],
		},
	});
	await studioApp.send(appHostContract.tabActions.renameTab, { id: "tab-web", label: "My docs" });
	await new Promise((settled) => setTimeout(settled, 50));
	const web = (await places.placedTabs()).tabs.find(({ id }) => id === "tab-web");
	const records = await studioApp.send(workspaces.chats.chatRecords);
	check(
		"renaming a page tab keeps its label and names no chat",
		[web?.label, records.ok ? records.output.chats.map(({ title }) => title) : records.reason],
		["My docs", ["Draft"]],
	);
}

await namingChecks();
await chatTabChecks();
await tabNameChecks();
await staleLabelChecks();
await pageTabChecks();
await tearOffChecks();
await unknownChatChecks();
console.log(tally.failed === 0 ? "chat opening: all checks pass" : `chat opening: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
