import { createElement as h } from "react";
import type { ReactNode } from "react";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { WorkspaceMoveItem } from "../workspace-move-item/workspace-move-item.js";

export interface TabWorkspaceMoveProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

export function TabWorkspaceMove({ tab, onDone }: TabWorkspaceMoveProps): ReactNode {
	return <WorkspaceMoveItem entry={{ kind: "tab", id: tab.id }} onDone={onDone} />;
}
