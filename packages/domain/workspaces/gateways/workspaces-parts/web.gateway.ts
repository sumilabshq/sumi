import { MemoryChatsGateway } from "../chats/memory.gateway.js";
import { MemoryWorkspacesGateway } from "../workspaces/memory.gateway.js";
import { workspacesPartsOf } from "./workspaces-parts.gateway.js";
import type { WorkspacesParts } from "./workspaces-parts.gateway.js";

export function webWorkspacesParts(name: string): WorkspacesParts {
	return workspacesPartsOf({
		workspacesGateway: new MemoryWorkspacesGateway({
			workspaces: [
				{
					id: name,
					name,
					icon: null,
				},
			],
			currentId: name,
		}),
		chatsGateway: new MemoryChatsGateway(),
	});
}
