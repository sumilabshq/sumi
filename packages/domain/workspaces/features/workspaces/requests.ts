import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { WorkspacesChangedEvent } from "../../gateways/workspaces/workspaces.events.js";
import { CurrentWorkspaceChangedEvent } from "../../gateways/current-workspace/current-workspace.events.js";
import { CurrentWorkspaceGateway } from "../../gateways/current-workspace/current-workspace.gateway.js";
import { WorkspacesGateway } from "../../gateways/workspaces/workspaces.gateway.js";
import { WorkspaceChatsGateway } from "../../gateways/workspace-chats/workspace-chats.gateway.js";
import { titleOf } from "../../shared/lib/chat-title.js";
import { currentWorkspaceOf } from "../../shared/lib/current-workspace.js";
import { ChatElsewhereSchema, ChatsElsewhereSchema } from "../../shared/schema/chat.schema.js";
import {
	WorkspaceIconChoiceSchema,
	WorkspaceIdSchema,
	WorkspaceNameSchema,
	WorkspacePositionSchema,
	WorkspacesSchema,
} from "../../shared/schema/workspace.schema.js";
import type {
	CurrentWorkspace,
	Workspace,
	WorkspaceFolder,
	WorkspaceRow,
	WorkspacesView,
} from "../../shared/schema/workspace.schema.js";

const KEYED_WORKSPACES = 9;
const KEY_HINT = "⌘{n}";
const NO_WORKSPACE_AT = "There is no workspace at ⌘{n}.";
const STRIP_FROM = 2;
const NO_NAME = "A workspace needs a name.";
const UNKNOWN = "There is no workspace {id}.";
const UNTITLED = "Untitled {n}";
const UNTITLED_NAME = /^Untitled (\d+)$/;

const OPENING = {
	workspaces: WorkspacesGateway,
	currentWorkspace: CurrentWorkspaceGateway,
};

interface OpeningParts {
	readonly workspaces: WorkspacesGateway;
	readonly currentWorkspace: CurrentWorkspaceGateway;
}

export const WorkspacesQuery = query("workspaces")
	.output(WorkspacesSchema)
	.settlesNow()
	.inject(OPENING)
	.handle((_input, { workspaces, currentWorkspace }) =>
		workspacesViewOf(workspaces.workspaces(), currentWorkspace.currentWorkspace()),
	);

export const OpenWorkspaceCommand = command("open-workspace")
	.input(WorkspaceIdSchema)
	.idempotencyKey(Repeatable)
	.inject(OPENING)
	.handle(({ id }, opening) => {
		opening.invalidate(WorkspacesQuery);
		return openWorkspace(id, opening);
	});

export const ChatsElsewhereQuery = query("chats-elsewhere")
	.output(ChatsElsewhereSchema)
	.inject({
		...OPENING,
		workspaceChats: WorkspaceChatsGateway,
	})
	.handle(async (_input, { workspaces, currentWorkspace, workspaceChats }) => {
		const currentId = currentWorkspace.currentWorkspace().currentId;
		const others = workspaces.workspaces().filter((workspace) => workspace.id !== currentId);
		const rows = await Promise.all(
			others.map(async (workspace) =>
				(await workspaceChats.chatsIn(workspace.id)).chats.map((chat) => ({
					workspaceId: workspace.id,
					workspaceName: workspace.name,
					chatId: chat.id,
					title: titleOf(chat),
				})),
			),
		);
		return { rows: rows.flat() };
	});

export const OpenChatElsewhereCommand = command("open-chat-elsewhere")
	.input(ChatElsewhereSchema)
	.idempotencyKey(Repeatable)
	.inject({
		...OPENING,
		workspaceChats: WorkspaceChatsGateway,
	})
	.handle(async ({ workspaceId, chatId }, { workspaceChats, ...opening }) => {
		opening.invalidate(WorkspacesQuery);
		const workspace = workspaceIn(opening.workspaces.workspaces(), workspaceId);

		if (workspace.id === opening.currentWorkspace.currentWorkspace().currentId) {
			return refuse(`workspace ${workspace.name} is already open: pick the chat in its own list`);
		}

		const kept = await workspaceChats.chatsIn(workspace.id);

		if (!kept.chats.some((chat) => chat.id === chatId)) {
			return refuse(`workspace ${workspace.name} has no chat ${chatId}`);
		}

		const reason = `workspace ${workspace.id} chat to open on start ${kept.openOnStartId ?? "none"} → ${chatId} (opened from elsewhere)`;
		await workspaceChats.saveChatToOpenIn(workspace.id, chatId, reason);
		console.info(`[widgetarium] ${reason}`);
		await openWorkspace(workspace.id, opening);
	});

export const OpenWorkspaceByPositionCommand = command("open-workspace-by-position")
	.input(WorkspacePositionSchema)
	.idempotencyKey(Repeatable)
	.inject(OPENING)
	.handle(async ({ position }, opening) => {
		opening.invalidate(WorkspacesQuery);
		const workspace = opening.workspaces.workspaces()[position];

		if (workspace === undefined || position >= KEYED_WORKSPACES) {
			console.info(`[widgetarium] workspaces: ${NO_WORKSPACE_AT.replace("{n}", String(position + 1))}`);
			return;
		}

		await openWorkspace(workspace.id, opening);
	});

export const CreateWorkspaceCommand = command("create-workspace")
	.output(WorkspaceIdSchema)
	.idempotencyKey(PerCall)
	.inject(OPENING)
	.handle(async (_input, opening) => {
		opening.invalidate(WorkspacesQuery);
		const name = untitledNameAfter(opening.workspaces.workspaces().map((workspace) => workspace.name));
		const created = await opening.workspaces.createWorkspace(name);
		console.info(`[widgetarium] workspaces: created ${created.name} (${created.id})`);
		await openWorkspace(created.id, opening);
		return { id: created.id };
	});

export const RenameWorkspaceCommand = command("rename-workspace")
	.input(WorkspaceNameSchema)
	.idempotencyKey(Repeatable)
	.inject({ workspaces: WorkspacesGateway })
	.handle(async ({ id, name }, { workspaces, invalidate }) => {
		invalidate(WorkspacesQuery);
		const trimmed = name.trim();

		if (trimmed === "") {
			return refuse(NO_NAME);
		}

		const was = workspaceIn(workspaces.workspaces(), id);

		if (was.name === trimmed) {
			console.info(`[widgetarium] workspace ${id} rename skipped: already ${trimmed}`);
			return;
		}

		const reason = `workspace ${id} name ${was.name} → ${trimmed}`;
		await workspaces.saveWorkspaceName(id, trimmed, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const SetWorkspaceIconCommand = command("set-workspace-icon")
	.input(WorkspaceIconChoiceSchema)
	.idempotencyKey(Repeatable)
	.inject({ workspaces: WorkspacesGateway })
	.handle(async ({ id, icon }, { workspaces, invalidate }) => {
		invalidate(WorkspacesQuery);
		const was = workspaceIn(workspaces.workspaces(), id);
		const reason = `workspace ${id} icon ${JSON.stringify(was.icon)} → ${JSON.stringify(icon)}`;
		await workspaces.saveWorkspaceIcon(id, icon, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const RereadWorkspacesSubscriber = subscriber(WorkspacesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(WorkspacesQuery);
});

export const RereadWorkspacesForCurrentSubscriber = subscriber(CurrentWorkspaceChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(WorkspacesQuery);
	},
);

async function openWorkspace(id: string, { workspaces, currentWorkspace }: OpeningParts): Promise<void> {
	const current = currentWorkspace.currentWorkspace();

	if (id === current.currentId) {
		console.info(`[widgetarium] open workspace ${id} skipped: it is the current one`);
		return;
	}

	workspaceIn(workspaces.workspaces(), id);
	currentWorkspace.saveCurrentWorkspace(
		{
			...current,
			openingId: id,
		},
		`workspace opening ${current.openingId ?? "none"} → ${id}`,
	);
	const folder = await workspaces.markWorkspaceOpened(id);

	if (isFolderMissing(folder)) {
		console.info(`[widgetarium] workspace ${id} lost its folder ${folder.folder ?? ""}: asking for it`);
		await workspaces.attachWorkspaceFolder(id);
	}

	const reason = `workspace current ${current.currentId} → ${id} (opened)`;
	currentWorkspace.saveCurrentWorkspace(
		{
			currentId: id,
			openingId: null,
		},
		reason,
	);
	console.info(`[widgetarium] ${reason}`);
}

function workspaceIn(workspaces: readonly Workspace[], id: string): Workspace {
	const found = workspaces.find((workspace) => workspace.id === id);
	return found ?? refuse(UNKNOWN.replace("{id}", id));
}

function isFolderMissing({ folder, isFolderFound }: WorkspaceFolder): boolean {
	return folder !== null && !isFolderFound;
}

function untitledNameAfter(names: readonly string[]): string {
	const taken = new Set(names.flatMap((name) => untitledNumberIn(name)));
	const free = Array.from({ length: taken.size + 1 }, (_, at) => at + 1).find((n) => !taken.has(n)) ?? 1;
	return UNTITLED.replace("{n}", String(free));
}

function untitledNumberIn(name: string): number[] {
	const found = UNTITLED_NAME.exec(name.trim());
	return found?.[1] === undefined ? [] : [Number(found[1])];
}

function workspacesViewOf(workspaces: readonly Workspace[], current: CurrentWorkspace): WorkspacesView {
	const rows = workspaceRowsOf(workspaces, current);
	return {
		current: rows.find((row) => row.isCurrent) ?? rowOf(currentWorkspaceOf(workspaces, current.currentId), current),
		rows,
		isOpening: current.openingId !== null,
		hasStrip: rows.length >= STRIP_FROM,
	};
}

function workspaceRowsOf(workspaces: readonly Workspace[], current: CurrentWorkspace): WorkspaceRow[] {
	return workspaces.map((workspace, at) => ({
		...rowOf(workspace, current),
		keyHint: at < KEYED_WORKSPACES ? KEY_HINT.replace("{n}", String(at + 1)) : null,
	}));
}

function rowOf(workspace: Workspace, { currentId, openingId }: CurrentWorkspace): WorkspaceRow {
	return {
		...workspace,
		isCurrent: workspace.id === currentId,
		isOpening: workspace.id === openingId,
		keyHint: null,
	};
}
