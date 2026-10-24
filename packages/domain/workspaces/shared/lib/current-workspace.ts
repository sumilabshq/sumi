import type { Workspace } from "../schema/workspace.schema.js";

const NAME_UNREAD = "…";

export function currentWorkspaceOf(workspaces: readonly Workspace[], currentId: string): Workspace {
	return (
		workspaces.find((workspace) => workspace.id === currentId) ?? {
			id: currentId,
			name: NAME_UNREAD,
			icon: null,
		}
	);
}
