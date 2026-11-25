import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { FlowRowFacts, FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import { requestProjectDraft } from "../../../../shared/lib/project-draft-request.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";

const MOVE_TO = "Move to";
const NEW_PROJECT = "New project…";

export interface MoveToSectionProps {
	readonly flow: FlowRowFacts;
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly onClose: () => void;
}

export function MoveToSection({ flow, sidebar, acts, onClose }: MoveToSectionProps): ReactElement {
	return (
		<div className="sumi-flows-menu-moves" role="group" aria-label={MOVE_TO}>
			<span className="sumi-flows-menu-label">{MOVE_TO}</span>
			{sidebar.projects.map((project) => (
				<PopoverItem
					key={project.id}
					role="menuitemradio"
					checked={project.id === flow.projectId}
					onClick={() => {
						onClose();
						acts.moveToProject(flow.id, project.id);
					}}
				>
					{project.name}
				</PopoverItem>
			))}
			<PopoverItem
				role="menuitem"
				icon={<Icon name="plus" />}
				onClick={() => {
					onClose();
					requestProjectDraft(flow.id);
				}}
			>
				{NEW_PROJECT}
			</PopoverItem>
		</div>
	);
}
