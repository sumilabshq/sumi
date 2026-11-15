import { NO_WORKSPACE_ID } from "@widgetarium/behaviors";
import type { Workspace } from "../schema/workspace.schema.js";

const NAME_UNREAD = "…";

export const NO_WORKSPACE: Workspace = {
	id: NO_WORKSPACE_ID,
	name: "No workspace",
	icon: null,
	ink: "yellow",
};

export function withNoWorkspace(workspaces: readonly Workspace[]): readonly Workspace[] {
	return [...workspaces, NO_WORKSPACE];
}

export function currentWorkspaceOf(workspaces: readonly Workspace[], currentId: string): Workspace {
	return (
		withNoWorkspace(workspaces).find((workspace) => workspace.id === currentId) ?? {
			id: currentId,
			name: NAME_UNREAD,
			icon: null,
			ink: "yellow",
		}
	);
}
