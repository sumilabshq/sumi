import {
	NameChatPaneCommand,
	OpenChatCommand,
	TearOffChatCommand,
} from "../packages/domain/app-host/generated/contract.ts";
import { PaneTreeQuery } from "../packages/state/layout/generated/contract.ts";
import { ChatListQuery, ChatToOpenQuery } from "../packages/domain/workspaces/generated/contract.ts";
import { FIRST_PANES } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
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
	const torn = await studioApp.send(TearOffChatCommand, { chatId: HOST_CHAT });
	check(
		"tearing off a chat closes it on this board first, then opens its own window",
		[torn.ok, await boardChatsOf(studioApp), pages.calls.at(-1)],
		[true, [], `chat window ${HOST_CHAT}`],
	);
}

await namingChecks();
await tearOffChecks();
await unknownChatChecks();
console.log(tally.failed === 0 ? "chat opening: all checks pass" : `chat opening: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
