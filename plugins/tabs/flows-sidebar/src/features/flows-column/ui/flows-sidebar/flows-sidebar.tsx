import { createElement as h } from "react";
import type { ReactNode } from "react";
import { FlowsWindowScope } from "../../../../shared/ui/flows-window-scope/flows-window-scope.js";
import { SidebarByLook } from "./sidebar-by-look.js";

export function FlowsSidebar(): ReactNode {
	return (
		<FlowsWindowScope>
			<SidebarByLook />
		</FlowsWindowScope>
	);
}
