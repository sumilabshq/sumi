import {
	NameChatPaneCommand,
	OpenChatCommand,
	OpenNewChatCommand,
	PinTabCommand,
	RenameTabCommand,
	TearOffTabCommand,
} from "../packages/domain/app-host/generated/contract.ts";
import { PaneTreeQuery } from "../packages/state/layout/generated/contract.ts";
import { ChatToOpenQuery } from "../packages/domain/workspaces/generated/contract.ts";
import { ChatListQuery } from "../packages/domain/app-host/generated/contract.ts";
import { FIRST_PANES } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally } from "./check-helpers.ts";

async function boardChatsOf(studioApp: StartedApp): Promise<readonly string[]> {
	const board = await studioApp.send(PaneTreeQuery);
	return board.ok ? board.output.chatGroups.map((group) => group.chatId) : [];
}

async function chatCountOf(studioApp: StartedApp): Promise<number> {
	const list = await studioApp.send(ChatListQuery);
	return list.ok ? list.output.pinned.length + list.output.recents.length : -1;
}

async function namingChecks(): Promise<void> {
	const { studioApp } = studioFakesOf({ tree: FIRST_PANES });
	const first = await studioApp.send(NameChatPaneCommand, { paneId: "pane-chat" });
	const again = await studioApp.send(NameChatPaneCommand, { paneId: "pane-chat" });
	const asked = await studioApp.send(ChatToOpenQuery);
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
	const opened = await studioApp.send(OpenChatCommand, { chatId: "chat-gone", paneId: null });
	check(
		"opening a chat that does not exist is refused before the layout changes",
		[opened.ok, await boardChatsOf(studioApp)],
		[false, before],
	);
}

async function tearOffChecks(): Promise<void> {
	const { studioApp, pages } = studioFakesOf();
	const torn = await studioApp.send(TearOffTabCommand, { id: HOST_CHAT });
	check(
		"a chat tears off through the tab command: places closes it on this board, then it opens in its own window",
		[torn.ok, await boardChatsOf(studioApp), pages.calls.at(-1)],
		[true, [], `chat window ${HOST_CHAT}`],
	);
}

async function chatTabChecks(): Promise<void> {
	const { studioApp, places, appHost } = studioFakesOf();
	const opened = await studioApp.send(OpenNewChatCommand, { title: "Plan" });
	const newId = opened.ok ? opened.output.id : "";
	await studioApp.send(PinTabCommand, { id: newId, isPinned: true });
	await studioApp.send(RenameTabCommand, { id: HOST_CHAT, label: "Renamed" });
	const list = await studioApp.send(ChatListQuery);
	const placed = await places.placedTabs();
	check(
		"a new chat is a tab, a pin moves it into Pinned in places, and a tab label names the chat",
		[
			list.ok ? list.output.pinned.map((row) => [row.id, row.title]) : list.reason,
			list.ok ? list.output.recents.map((row) => [row.id, row.title]) : list.reason,
			placed.lists["pinned"]?.map((entry) => entry.id),
			appHost.studioWindow.windowLabel(),
		],
		[[[newId, "Plan"]], [[HOST_CHAT, "Renamed"]], [newId], "main"],
	);
}

await namingChecks();
await chatTabChecks();
await tearOffChecks();
await unknownChatChecks();
console.log(tally.failed === 0 ? "chat opening: all checks pass" : `chat opening: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
