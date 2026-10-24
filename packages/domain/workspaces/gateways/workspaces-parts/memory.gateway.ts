import type { ChatMarks, KeptChats } from "../../shared/schema/chat.schema.js";
import type { Workspace } from "../../shared/schema/workspace.schema.js";
import { MemoryChatMarksGateway } from "../chat-marks/memory.gateway.js";
import { MemoryChatsGateway } from "../chats/memory.gateway.js";
import { MemoryCurrentWorkspaceGateway } from "../current-workspace/memory.gateway.js";
import { MemoryWorkspaceChatsGateway } from "../workspace-chats/memory.gateway.js";
import { MemoryWorkspacesGateway } from "../workspaces/memory.gateway.js";
import type { WorkspacesParts } from "./workspaces-parts.gateway.js";

export interface WorkspacesSeed {
	readonly workspaces: readonly Workspace[];
	readonly currentId: string;
	readonly chats: KeptChats;
	readonly marks: ChatMarks;
	readonly chatsElsewhere?: Readonly<Record<string, KeptChats>>;
}

export function memoryWorkspacesParts({
	workspaces,
	currentId,
	chats,
	marks,
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
		chatMarks: new MemoryChatMarksGateway(marks),
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
				isPinned: false,
				createdAt: at,
				lastAt: at,
			},
		],
		activeId: id,
	};
}
