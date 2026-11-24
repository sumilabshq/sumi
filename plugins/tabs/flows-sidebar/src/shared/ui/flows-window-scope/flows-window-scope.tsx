import { createElement as h, useContext } from "react";
import type { ReactNode } from "react";
import { FlowsWindowContext } from "../../lib/flows-window.js";
import { WorkspaceWindowScope } from "./workspace-window-scope.js";

export interface FlowsWindowScopeProps {
	readonly children: ReactNode;
}

export function FlowsWindowScope({ children }: FlowsWindowScopeProps): ReactNode {
	const given = useContext(FlowsWindowContext);
	return given === null ? <WorkspaceWindowScope>{children}</WorkspaceWindowScope> : children;
}
