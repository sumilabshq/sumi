import { MAIN_STUDIO_WINDOW, placesWindowOf } from "@widgetarium/behaviors";
import type { KeptChats } from "../../shared/schema/chat.schema.js";
import type { Workspace } from "../../shared/schema/workspace.schema.js";
import { MemoryChatsGateway } from "../chats/memory.gateway.js";
import { MemoryCurrentWorkspaceGateway } from "../current-workspace/memory.gateway.js";
import { MemoryWorkspaceChatsGateway } from "../workspace-chats/memory.gateway.js";
import { MemoryWorkspacesGateway } from "../workspaces/memory.gateway.js";
import { MemoryProfileWindowsGateway } from "../profile-windows/memory.gateway.js";
import { FixedOwnWindowGateway } from "../own-window/fixed.gateway.js";
import type { WorkspacesParts } from "./workspaces-parts.gateway.js";

export interface WorkspacesSeed {
	readonly workspaces: readonly Workspace[];
	readonly currentId: string;
	readonly chats: KeptChats;
	readonly chatsElsewhere?: Readonly<Record<string, KeptChats>>;
}

export function memoryWorkspacesParts({
	workspaces,
	currentId,
	chats,
	chatsElsewhere = {},
}: WorkspacesSeed): WorkspacesParts {
	return {
		workspaceChats: new MemoryWorkspaceChatsGateway(chatsElsewhere),
		workspaces: new MemoryWorkspacesGateway(workspaces),
		currentWorkspace: new MemoryCurrentWorkspaceGateway({
			currentId,
			openingId: null,
		}),
		chats: new MemoryChatsGateway(chats),
		profileWindows: new MemoryProfileWindowsGateway(),
		ownWindow: new FixedOwnWindowGateway(placesWindowOf(MAIN_STUDIO_WINDOW, currentId)),
	};
}

export function firstChats(): KeptChats {
	const at = Date.now();
	const id = crypto.randomUUID();
	return {
		chats: [
			{
				id,
				title: null,
				createdAt: at,
				lastAt: at,
			},
		],
		openOnStartId: id,
	};
}
