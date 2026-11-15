import { firstChats, memoryWorkspacesParts } from "./memory.gateway.js";
import type { WorkspacesParts } from "./workspaces-parts.gateway.js";

export function webWorkspacesParts(workspaceId: string): WorkspacesParts {
	return memoryWorkspacesParts({
		workspaces: [
			{
				id: workspaceId,
				name: workspaceId,
				icon: null,
				ink: "yellow",
			},
		],
		currentId: workspaceId,
		chats: firstChats(),
	});
}
