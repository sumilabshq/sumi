import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useFlowDrag } from "../../../../shared/lib/flow-drag.js";
import { useFlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { useFlowsSidebar } from "../../../../shared/lib/use-flows-sidebar.js";
import { InboxSection } from "../../../inbox/ui/inbox-section/inbox-section.js";
import { EmptySpaceMenu } from "../empty-space-menu/empty-space-menu.js";
import { ProjectSections } from "../project-section/project-sections.js";

export function SidebarBody(): ReactNode {
	const sidebar = useFlowsSidebar();
	const acts = useFlowActs();
	const drag = useFlowDrag(acts);

	if (!sidebar.isConverted) {
		return null;
	}

	return (
		<EmptySpaceMenu sidebar={sidebar} acts={acts}>
			<InboxSection sidebar={sidebar} acts={acts} />
			<ProjectSections sidebar={sidebar} acts={acts} drag={drag} />
		</EmptySpaceMenu>
	);
}
