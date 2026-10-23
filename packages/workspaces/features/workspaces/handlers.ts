import { handler, refuse } from "@widgetarium/core/requests";
import { WorkspacesGateway } from "../../gateways/workspaces/workspaces.gateway.js";
import { WorkspacesStore } from "../../shared/lib/workspaces-store.js";
import type { WorkspacesMoment } from "../../shared/lib/workspaces-store.js";
import type { WorkspaceRow, WorkspacesView } from "../../shared/schema/workspace.schema.js";
import { WorkspacesClientModule } from "../../module.js";
import {
	CreateWorkspaceCommand,
	OpenWorkspaceByPositionCommand,
	OpenWorkspaceCommand,
	RenameWorkspaceCommand,
	SetWorkspaceIconCommand,
	WorkspacesQuery,
} from "./contract.js";

const KEYED_WORKSPACES = 9;
const KEY_HINT = "⌘{n}";
const NO_WORKSPACE_AT = "There is no workspace at ⌘{n}.";
const STRIP_FROM = 2;

const OPENING = {
	workspacesStore: WorkspacesStore,
	workspacesGateway: WorkspacesGateway,
};

interface OpeningParts {
	readonly workspacesStore: WorkspacesStore;
	readonly workspacesGateway: WorkspacesGateway;
}

export const WorkspacesQueryHandler = handler(WorkspacesQuery, WorkspacesClientModule)
	.inject({ workspacesStore: WorkspacesStore })
	.watch((_input, { workspacesStore }, changed) => workspacesStore.watch(changed))
	.handle((_input, { workspacesStore }) => workspacesOf(workspacesStore.now()));

export const OpenWorkspaceCommandHandler = handler(OpenWorkspaceCommand, WorkspacesClientModule)
	.inject(OPENING)
	.handle(({ id }, parts) => openWorkspace(id, parts));

export const OpenWorkspaceByPositionCommandHandler = handler(OpenWorkspaceByPositionCommand, WorkspacesClientModule)
	.inject(OPENING)
	.handle(({ position }, parts) => {
		const workspace = parts.workspacesStore.now().workspaces[position];
		if (workspace === undefined || position >= KEYED_WORKSPACES) {
			console.info(`[widgetarium] workspaces: ${NO_WORKSPACE_AT.replace("{n}", String(position + 1))}`);
			return Promise.resolve();
		}

		return openWorkspace(workspace.id, parts);
	});

export const CreateWorkspaceCommandHandler = handler(CreateWorkspaceCommand, WorkspacesClientModule)
	.inject(OPENING)
	.handle(async (_input, parts) => {
		const created = await parts.workspacesGateway.create(parts.workspacesStore.nextUntitledName());
		parts.workspacesStore.add(created);
		await openWorkspace(created.id, parts);
	});

export const RenameWorkspaceCommandHandler = handler(RenameWorkspaceCommand, WorkspacesClientModule)
	.inject(OPENING)
	.handle(({ id, name }, { workspacesStore, workspacesGateway }) => {
		const refusal = workspacesStore.rename(id, name);
		if (refusal !== null) {
			return refuse(refusal);
		}

		keepInBackground(workspacesGateway.rename(id, name.trim()), `rename ${id}`);
	});

export const SetWorkspaceIconCommandHandler = handler(SetWorkspaceIconCommand, WorkspacesClientModule)
	.inject(OPENING)
	.handle(({ id, icon }, { workspacesStore, workspacesGateway }) => {
		workspacesStore.setIcon(id, icon);
		keepInBackground(workspacesGateway.keepIcon(id, icon), `icon of ${id}`);
	});

async function openWorkspace(id: string, { workspacesStore, workspacesGateway }: OpeningParts): Promise<void> {
	if (id === workspacesStore.now().currentId) {
		return;
	}

	workspacesStore.open(id);
	await workspacesGateway.open(id);
	workspacesStore.finishOpening(id);
}

function keepInBackground(written: Promise<void>, what: string): void {
	written.catch((failure: unknown) => {
		console.error(`[widgetarium] workspaces could not keep ${what}`, failure);
	});
}

function workspacesOf(moment: WorkspacesMoment): WorkspacesView {
	const rows = workspaceRowsOf(moment);
	const current = rows.find((row) => row.isCurrent) ?? rows[0];
	if (current === undefined) {
		throw new Error("a workspaces store always holds the current workspace");
	}

	return {
		current,
		rows,
		isOpening: moment.openingId !== null,
		hasStrip: rows.length >= STRIP_FROM,
	};
}

function workspaceRowsOf({ workspaces, currentId, openingId }: WorkspacesMoment): WorkspaceRow[] {
	return workspaces.map((workspace, at) => ({
		...workspace,
		isCurrent: workspace.id === currentId,
		isOpening: workspace.id === openingId,
		keyHint: at < KEYED_WORKSPACES ? KEY_HINT.replace("{n}", String(at + 1)) : null,
	}));
}
