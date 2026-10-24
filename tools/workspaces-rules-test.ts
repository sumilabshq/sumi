import { app } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import {
	ActiveChatQuery,
	ChatListQuery,
	CreateChatCommand,
	CreateWorkspaceCommand,
	OpenWorkspaceByPositionCommand,
	OpenWorkspaceCommand,
	PinChatCommand,
	RecordChatTurnCommand,
	RenameChatCommand,
	RenameWorkspaceCommand,
	SelectChatCommand,
	SetWorkspaceIconCommand,
	WorkspacesQuery,
} from "../packages/domain/workspaces/generated/contract.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { MemoryWorkspacesGateway } from "../packages/domain/workspaces/gateways/workspaces/memory.gateway.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";
import type { KeptChat } from "../packages/domain/workspaces/shared/schema/chat.schema.ts";
import type { WorkspaceFolder } from "../packages/domain/workspaces/shared/schema/workspace.schema.ts";
import { check, tally } from "./check-helpers.ts";
import { quietly } from "./host-tauri-fake-store.ts";

const LONG_ASK = `${"a".repeat(90)}\nsecond line`;

class LostFolderWorkspacesGateway extends MemoryWorkspacesGateway {
	attaches = 0;

	override markWorkspaceOpened(): Promise<WorkspaceFolder> {
		return Promise.resolve({
			folder: "/gone",
			isFolderFound: false,
		});
	}

	override attachWorkspaceFolder(): Promise<void> {
		this.attaches += 1;
		return Promise.resolve();
	}
}

function chatOf(id: string, lastAt: number, isPinned = false): KeptChat {
	return {
		id,
		title: null,
		isPinned,
		createdAt: lastAt,
		lastAt,
	};
}

function seededParts(): WorkspacesParts {
	return memoryWorkspacesParts({
		workspaces: [
			{
				id: "home",
				name: "Home",
				icon: null,
			},
			{
				id: "lab",
				name: "Untitled 2",
				icon: null,
			},
		],
		currentId: "home",
		chats: {
			chats: [chatOf("old", 1), chatOf("pinned", 2, true), chatOf("new", 3)],
			activeId: "gone",
		},
		marks: {},
	});
}

function started(parts: WorkspacesParts): StartedApp {
	return app().modules(WorkspacesModule.with(parts)).start();
}

function outputOf(answer: { readonly ok: boolean; readonly reason?: string; readonly output?: unknown }): unknown {
	return answer.ok ? answer.output : answer.reason;
}

async function workspaceChecks(): Promise<void> {
	const parts = seededParts();
	const workspaces = started(parts);
	const emptyName = await workspaces.send(RenameWorkspaceCommand, { id: "home", name: "  " });
	check("a blank workspace name is refused", outputOf(emptyName), "A workspace needs a name.");
	await workspaces.send(RenameWorkspaceCommand, { id: "home", name: "  Base  " });
	check("a rename keeps the trimmed name", parts.workspaces.workspaces()[0]?.name, "Base");
	const unknown = await workspaces.send(SetWorkspaceIconCommand, { id: "nope", icon: null });
	check("an icon for an unknown workspace is refused", outputOf(unknown), "There is no workspace nope.");

	await workspaces.send(OpenWorkspaceByPositionCommand, { position: 9 });
	check("⌘10 opens nothing", parts.currentWorkspace.currentWorkspace().currentId, "home");
	await workspaces.send(OpenWorkspaceByPositionCommand, { position: 1 });
	check("⌘2 opens the second workspace", parts.currentWorkspace.currentWorkspace(), {
		currentId: "lab",
		openingId: null,
	});

	await workspaces.send(CreateWorkspaceCommand);
	const view = WorkspacesQuery.outputSchema.parse(outputOf(await workspaces.send(WorkspacesQuery)));
	check(
		"a new workspace takes the first free untitled number and becomes current",
		[view.current.name, view.rows.map((row) => row.keyHint)],
		["Untitled 1", ["⌘1", "⌘2", "⌘3"]],
	);
}

async function lostFolderChecks(): Promise<void> {
	const lost = new LostFolderWorkspacesGateway([
		{
			id: "home",
			name: "Home",
			icon: null,
		},
		{
			id: "lab",
			name: "Lab",
			icon: null,
		},
	]);
	const parts = {
		...seededParts(),
		workspaces: lost,
	};
	await started(parts).send(OpenWorkspaceCommand, { id: "lab" });
	check(
		"opening a workspace whose folder is gone asks for it, then makes it current",
		[lost.attaches, parts.currentWorkspace.currentWorkspace().currentId],
		[1, "lab"],
	);
}

async function chatChecks(): Promise<void> {
	const parts = seededParts();
	const chats = started(parts);
	const activeOf = async (): Promise<unknown> => outputOf(await chats.send(ActiveChatQuery));
	check("an active id the chats lost falls back to the latest chat", await activeOf(), {
		id: "new",
		title: "New chat",
	});
	const list = ChatListQuery.outputSchema.parse(outputOf(await chats.send(ChatListQuery)));
	check(
		"the list puts pinned chats apart and the latest first",
		[list.pinned.map((row) => row.id), list.recents.map((row) => row.id)],
		[["pinned"], ["new", "old"]],
	);

	const blank = await chats.send(RenameChatCommand, { id: "old", title: " " });
	check("a blank chat title is refused", outputOf(blank), "A chat needs a title.");
	await chats.send(PinChatCommand, { id: "old", isPinned: true });
	check("a pin is kept", parts.chats.chats().chats.find((chat) => chat.id === "old")?.isPinned, true);

	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: true, firstAsked: LONG_ASK });
	const titled = parts.chats.chats().chats.find((chat) => chat.id === "old");
	check(
		"a first ask names the chat by its first line, cut to 80 characters, and marks it running",
		[titled?.title?.length, titled?.title?.endsWith("…"), parts.chatMarks.chatMarks()["old"]],
		[80, true, "running"],
	);
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: false, firstAsked: LONG_ASK });
	check("a chat finishing while not shown is unread", parts.chatMarks.chatMarks()["old"], "unread");
	await chats.send(SelectChatCommand, { id: "old" });
	check(
		"selecting it clears unread and makes it active",
		[parts.chatMarks.chatMarks(), await activeOf()],
		[{}, { id: "old", title: titled?.title }],
	);
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: true, firstAsked: null });
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: false, firstAsked: null });
	check("a chat finishing while shown is not unread", parts.chatMarks.chatMarks(), {});

	await chats.send(CreateChatCommand);
	const created = parts.chats.chats();
	check(
		"a new chat is untitled and becomes active",
		[created.chats.length, created.chats.at(-1)?.title, created.activeId === created.chats.at(-1)?.id],
		[4, null, true],
	);
}

await quietly(async () => {
	await workspaceChecks();
	await lostFolderChecks();
	await chatChecks();
});
console.log(tally.failed ? `workspaces: ${tally.failed} check(s) failed` : "workspaces: all checks passed");
process.exit(tally.failed ? 1 : 0);
