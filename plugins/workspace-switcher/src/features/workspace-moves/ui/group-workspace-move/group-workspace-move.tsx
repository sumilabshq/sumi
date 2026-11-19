import { createElement as h, Fragment } from "react";
import type { ReactNode } from "react";
import { PopoverSeparator } from "@widgetarium/kit";
import type { SidebarGroupState } from "@widgetarium/app-host/contract";
import { WorkspaceMoveItem } from "../workspace-move-item/workspace-move-item.js";

export interface GroupWorkspaceMoveProps {
	readonly group: SidebarGroupState;
	readonly onDone: () => void;
}

export function GroupWorkspaceMove({ group, onDone }: GroupWorkspaceMoveProps): ReactNode {
	return (
		<>
			<PopoverSeparator />
			<WorkspaceMoveItem entry={{ kind: "group", id: group.id }} onDone={onDone} />
		</>
	);
}
