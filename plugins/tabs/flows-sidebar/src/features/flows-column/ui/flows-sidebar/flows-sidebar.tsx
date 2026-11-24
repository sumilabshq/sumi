import { createElement as h } from "react";
import type { ReactNode } from "react";
import { InboxClearingScope } from "../../../inbox/ui/inbox-clearing-scope/inbox-clearing-scope.js";
import { SidebarByLook } from "./sidebar-by-look.js";

export function FlowsSidebar(): ReactNode {
	return (
		<InboxClearingScope>
			<SidebarByLook />
		</InboxClearingScope>
	);
}
