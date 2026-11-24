import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useFlowDrag } from "../../../../shared/lib/flow-drag.js";
import { useFlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { useFlowsSidebar } from "../../../../shared/lib/use-flows-sidebar.js";
import { InboxSection } from "../../../inbox/ui/inbox-section/inbox-section.js";
import { FlowsSection } from "../flows-section/flows-section.js";

export function SidebarBody(): ReactNode {
	const sidebar = useFlowsSidebar();
	const acts = useFlowActs();
	const drag = useFlowDrag(acts.move);

	if (!sidebar.isConverted) {
		return null;
	}

	return (
		<div className="sumi-flows">
			<InboxSection sidebar={sidebar} acts={acts} />
			<FlowsSection sidebar={sidebar} acts={acts} drag={drag} />
		</div>
	);
}
