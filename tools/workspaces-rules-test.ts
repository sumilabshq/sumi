import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import {
	ChatToOpenQuery,
	ForgetChatToOpenCommand,
	ChatRecordsQuery,
	CreateChatCommand,
	CreateWorkspaceCommand,
	OpenWorkspaceByPositionCommand,
	OpenWorkspaceCommand,
	RecordChatTurnCommand,
	RenameWorkspaceCommand,
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
import { placedTabsOf, placesOver } from "./places-fixture.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MarkTabSeenCommand } from "../packages/state/places/generated/contract.ts";

const SEEDED_CHATS = ["old", "pinned", "new"];

const NO_SESSION_TABS = { tabs: [], shownId: null, minted: 0, closed: [] };

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

function chatOf(id: string, lastAt: number): KeptChat {
	return {
		id,
		title: null,
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
			chats: [chatOf("old", 1), chatOf("pinned", 2), chatOf("new", 3)],
			openOnStartId: "gone",
		},
	});
}

function started(
	parts: WorkspacesParts,
	tabs = new MemoryTabsGateway(placedTabsOf(NO_SESSION_TABS, SEEDED_CHATS)),
): Runtime {
	return runtime().modules(WorkspacesModule({ injects: parts })).imports(placesOver(tabs)).start();
}

async function marksIn(tabs: MemoryTabsGateway): Promise<Readonly<Record<string, string>>> {
	const placed = await tabs.placedTabs();
	return Object.fromEntries(placed.tabs.filter((tab) => tab.mark !== "none").map((tab) => [tab.id, tab.mark]));
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
	const tabs = new MemoryTabsGateway(placedTabsOf(NO_SESSION_TABS, SEEDED_CHATS));
	const chats = started(parts, tabs);
	const toOpen = async (): Promise<unknown> => outputOf(await chats.send(ChatToOpenQuery));
	check("a chat asked to open on start that the chats lost opens nothing", await toOpen(), { isRead: true, id: null });
	const records = ChatRecordsQuery.outputSchema.parse(outputOf(await chats.send(ChatRecordsQuery)));
	check(
		"the records hold every chat with its title and no pin or mark: places keeps where a chat stands and how",
		[records.isRead, records.chats.map((row) => [row.id, row.title]).sort()],
		[
			true,
			[
				["new", "New chat"],
				["old", "New chat"],
				["pinned", "New chat"],
			],
		],
	);

	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: true, isSeen: false, firstAsked: LONG_ASK });
	const titled = parts.chats.chats().chats.find((chat) => chat.id === "old");
	check(
		"a first ask names the chat by its first line, cut to 80 characters, and places marks its tab running under that title",
		[
			titled?.title?.length,
			titled?.title?.endsWith("…"),
			(await marksIn(tabs))["old"],
			(await tabs.placedTabs()).tabs.find((tab) => tab.id === "old")?.title === titled?.title,
		],
		[80, true, "running", true],
	);
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: false, isSeen: false, firstAsked: LONG_ASK });
	check("a chat finishing while not shown is unread", (await marksIn(tabs))["old"], "unread");
	const openBefore = parts.chats.chats().openOnStartId;
	await chats.send(MarkTabSeenCommand, { id: "old" });
	check(
		"marking it seen clears unread and moves no chat anywhere",
		[await marksIn(tabs), parts.chats.chats().openOnStartId],
		[{}, openBefore],
	);
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: true, isSeen: true, firstAsked: null });
	await chats.send(RecordChatTurnCommand, { chatId: "old", isBusy: false, isSeen: true, firstAsked: null });
	check("a chat finishing while on screen is not unread", await marksIn(tabs), {});

	const made = await chats.send(CreateChatCommand, { title: "  Plan it  " });
	const created = parts.chats.chats();
	check(
		"a new chat answers its own id, takes the title asked, and opens nothing by itself",
		[
			created.chats.length,
			created.chats.at(-1)?.id === (made.ok ? made.output.id : null),
			created.chats.at(-1)?.title,
			created.openOnStartId,
		],
		[4, true, "Plan it", openBefore],
	);
	const madeId = made.ok ? made.output.id : "";
	check(
		"and places keeps a tab for it under that title",
		(await tabs.placedTabs()).tabs.find((tab) => tab.id === madeId)?.title,
		"Plan it",
	);

	parts.chats.saveChats({ ...parts.chats.chats(), openOnStartId: "old" }, "asked from another workspace");
	check("a chat asked from another workspace is the one to open on start", await toOpen(), { isRead: true, id: "old" });
	await chats.send(ForgetChatToOpenCommand, { id: "new" });
	check("forgetting another chat leaves the asked one in place", await toOpen(), { isRead: true, id: "old" });
	await chats.send(ForgetChatToOpenCommand, { id: "old" });
	check("once opened it is forgotten", await toOpen(), { isRead: true, id: null });
}

await quietly(async () => {
	await workspaceChecks();
	await lostFolderChecks();
	await chatChecks();
});
console.log(tally.failed ? `workspaces: ${tally.failed} check(s) failed` : "workspaces: all checks passed");
process.exit(tally.failed ? 1 : 0);
