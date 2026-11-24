import { createElement as h } from "react";
import type { ReactNode } from "react";
import { placesWindowHere } from "@widgetarium/behaviors";
import { useQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { FlowsWindowContext } from "../../lib/flows-window.js";

export interface WorkspaceWindowScopeProps {
	readonly children: ReactNode;
}

export function WorkspaceWindowScope({ children }: WorkspaceWindowScopeProps): ReactNode {
	const workspaceId = useQuery(workspaces.workspaces.all).data.current.id;
	return (
		<FlowsWindowContext.Provider value={placesWindowHere(window.location.search, workspaceId)}>
			{children}
		</FlowsWindowContext.Provider>
	);
}
