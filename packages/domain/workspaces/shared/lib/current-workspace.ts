import { NO_WORKSPACE_ID } from "@widgetarium/behaviors";
import type { Workspace } from "../schema/workspace.schema.js";

const NAME_UNREAD = "…";
const NO_WORKSPACE_NAME = "No workspace";

export function currentWorkspaceOf(workspaces: readonly Workspace[], currentId: string): Workspace {
	return (
		workspaces.find((workspace) => workspace.id === currentId) ?? {
			id: currentId,
			name: currentId === NO_WORKSPACE_ID ? NO_WORKSPACE_NAME : NAME_UNREAD,
			icon: null,
			ink: "yellow",
		}
	);
}
