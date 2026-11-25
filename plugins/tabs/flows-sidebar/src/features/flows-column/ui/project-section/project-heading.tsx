import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { ProjectFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { ProjectMenu } from "./project-menu.js";

const TOOL_PX = 13;

export interface ProjectHeadingProps {
	readonly project: ProjectFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
	readonly onNewSession: () => void;
	readonly onRename: () => void;
}

export function ProjectHeading({ project, acts, drag, onNewSession, onRename }: ProjectHeadingProps): ReactElement {
	const [at, setAt] = useState<MenuSpot | null>(null);
	return (
		<div
			className="sumi-flows-label"
			data-kind="project"
			onContextMenu={(event) => {
				event.preventDefault();
				event.stopPropagation();
				setAt({ x: event.clientX, y: event.clientY });
			}}
			{...drag.sourceProps({ kind: "project", id: project.id })}
		>
			<span>{project.name}</span>
			<span className="sumi-flows-label-tools">
				<button
					type="button"
					className="sumi-flows-tool"
					aria-label={`New session in ${project.name}`}
					onClick={onNewSession}
				>
					<Icon name="plus" size={TOOL_PX} />
				</button>
				<button
					type="button"
					className="sumi-flows-tool"
					aria-label={`${project.name} menu`}
					onClick={(event) => {
						const box = event.currentTarget.getBoundingClientRect();
						setAt({ x: box.left, y: box.bottom });
					}}
				>
					<Icon name="ellipsis" size={TOOL_PX} />
				</button>
			</span>
			<ProjectMenu project={project} at={at} acts={acts} onRename={onRename} onClose={() => setAt(null)} />
		</div>
	);
}
