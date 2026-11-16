import { NO_WORKSPACE_ID } from "@widgetarium/behaviors";
import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { workspacesChanged } from "../../gateways/workspaces/workspaces.events.js";
import { currentWorkspaceChanged } from "../../gateways/current-workspace/current-workspace.events.js";
import { CurrentWorkspaceGateway } from "../../gateways/current-workspace/current-workspace.gateway.js";
import { WorkspacesGateway } from "../../gateways/workspaces/workspaces.gateway.js";
import { ProfileWindowsGateway } from "../../gateways/profile-windows/profile-windows.gateway.js";
import { titleOf } from "../../shared/lib/chat-title.js";
import { currentWorkspaceOf, withNoWorkspace } from "../../shared/lib/current-workspace.js";
import { ChatElsewhereSchema, ChatsElsewhereSchema } from "../../shared/schema/chat.schema.js";
import {
	WorkspaceIconChoiceSchema,
	WorkspaceIdSchema,
	WorkspaceInkChoiceSchema,
	WorkspaceNameSchema,
	WorkspacePositionSchema,
	WorkspacesSchema,
} from "../../shared/schema/workspace.schema.js";
import type {
	CurrentWorkspace,
	Workspace,
	WorkspaceRow,
	WorkspacesView,
} from "../../shared/schema/workspace.schema.js";

const KEYED_WORKSPACES = 9;
const KEY_HINT = "⌃{n}";
const NO_WORKSPACE_AT = "There is no workspace at ⌃{n}.";
const STRIP_FROM = 2;
const NO_NAME = "A workspace needs a name.";
const UNKNOWN = "There is no workspace {id}.";

interface OpeningParts {
	readonly workspaces: WorkspacesGateway;
	readonly currentWorkspace: CurrentWorkspaceGateway;
	readonly profileWindows: ProfileWindowsGateway;
}

export const all = query()
	.public()
	.output(WorkspacesSchema)
	.settlesNow()
	.handle((_input, { workspaces, currentWorkspace }) =>
		workspacesViewOf(workspaces.workspaces(), currentWorkspace.currentWorkspace()),
	);

export const open = command()
	.public()
	.input(WorkspaceIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, opening) => {
		opening.invalidate(all);

		if (id === opening.currentWorkspace.currentWorkspace().currentId) {
			console.info(`[widgetarium] open profile ${id} skipped: this window already shows it`);
			return;
		}

		await openProfileWindow(id, opening, "opened from this window");
	});

export const openWindow = command()
	.public()
	.input(WorkspaceIdSchema)
	.idempotencyKey(PerCall)
	.handle(({ id }, opening) => openProfileWindow(id, opening, "asked for a new window"));

export const openWithoutWorkspace = command()
	.public()
	.idempotencyKey(PerCall)
	.handle((_input, { profileWindows }) =>
		profileWindows.openWindow(NO_WORKSPACE_ID, "window none → new window without a workspace (asked)"),
	);

export const chatsElsewhere = query()
	.public()
	.output(ChatsElsewhereSchema)
	.handle(async (_input, { workspaces, currentWorkspace, workspaceChats }) => {
		const currentId = currentWorkspace.currentWorkspace().currentId;
		const others = withNoWorkspace(workspaces.workspaces()).filter((workspace) => workspace.id !== currentId);
		const rows = await Promise.all(
			others.map(async (workspace) =>
				(await workspaceChats.chatsIn(workspace.id)).chats.map((chat) => ({
					workspaceId: workspace.id,
					workspaceName: workspace.name,
					chatId: chat.id,
					title: titleOf(chat),
					lastAt: chat.lastAt,
				})),
			),
		);
		return { rows: rows.flat() };
	});

export const openChatElsewhere = command()
	.public()
	.input(ChatElsewhereSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ workspaceId, chatId }, { workspaceChats, ...opening }) => {
		opening.invalidate(all);
		const workspace = workspaceIn(withNoWorkspace(opening.workspaces.workspaces()), workspaceId);

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
		await openProfileWindow(workspace.id, opening, `chat ${chatId} opened from elsewhere`);
	});

export const openByPosition = command()
	.public()
	.input(WorkspacePositionSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ position }, opening) => {
		opening.invalidate(all);
		const workspace = opening.workspaces.workspaces()[position];

		if (workspace === undefined || position >= KEYED_WORKSPACES) {
			console.info(`[widgetarium] workspaces: ${NO_WORKSPACE_AT.replace("{n}", String(position + 1))}`);
			return;
		}

		await openProfileWindow(workspace.id, opening, `⌘${position + 1}`);
	});

export const createWorkspace = command()
	.public()
	.output(WorkspaceIdSchema.nullable())
	.idempotencyKey(PerCall)
	.handle(async (_input, opening) => {
		opening.invalidate(all);
		const created = await opening.workspaces.createWorkspace();

		if (created === null) {
			console.info("[widgetarium] workspaces: no folder picked, nothing created");
			return null;
		}

		console.info(`[widgetarium] workspaces: opened folder ${created.name} (${created.id})`);
		await openProfileWindow(created.id, opening, "created");
		return { id: created.id };
	});

export const rename = command()
	.public()
	.input(WorkspaceNameSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, name }, { workspaces: workspacesGateway, invalidate }) => {
		invalidate(all);
		const trimmed = name.trim();

		if (trimmed === "") {
			return refuse(NO_NAME);
		}

		const was = workspaceIn(workspacesGateway.workspaces(), id);

		if (was.name === trimmed) {
			console.info(`[widgetarium] workspace ${id} rename skipped: already ${trimmed}`);
			return;
		}

		const reason = `workspace ${id} name ${was.name} → ${trimmed}`;
		await workspacesGateway.saveWorkspaceName(id, trimmed, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const setIcon = command()
	.public()
	.input(WorkspaceIconChoiceSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, icon }, { workspaces: workspacesGateway, invalidate }) => {
		invalidate(all);
		const was = workspaceIn(workspacesGateway.workspaces(), id);
		const reason = `workspace ${id} icon ${JSON.stringify(was.icon)} → ${JSON.stringify(icon)}`;
		await workspacesGateway.saveWorkspaceIcon(id, icon, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const setInk = command()
	.public()
	.input(WorkspaceInkChoiceSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, ink }, { workspaces: workspacesGateway, invalidate }) => {
		invalidate(all);
		const was = workspaceIn(workspacesGateway.workspaces(), id);

		if (was.ink === ink) {
			console.info(`[widgetarium] workspace ${id} ink skipped: already ${ink}`);
			return;
		}

		const reason = `workspace ${id} ink ${was.ink} → ${ink}`;
		await workspacesGateway.saveWorkspaceInk(id, ink, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const rereadWorkspaces = subscriber(workspacesChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

export const rereadForCurrent = subscriber(currentWorkspaceChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

async function openProfileWindow(id: string, { workspaces, profileWindows }: OpeningParts, asked: string): Promise<void> {
	const profile = workspaceIn(withNoWorkspace(workspaces.workspaces()), id);
	await profileWindows.openWindow(profile.id, `window none → new window in profile ${profile.name} (${asked})`);
}

function workspaceIn(workspaces: readonly Workspace[], id: string): Workspace {
	const found = workspaces.find((workspace) => workspace.id === id);
	return found ?? refuse(UNKNOWN.replace("{id}", id));
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
