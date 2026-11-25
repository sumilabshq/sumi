import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { ProjectSection } from "./project-section.js";

export interface ProjectSectionsProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function ProjectSections({ sidebar, acts, drag }: ProjectSectionsProps): ReactElement {
	return (
		<Fragment>
			{sidebar.projects.map((project, index) => (
				<ProjectSection
					key={project.id}
					project={project}
					nextProjectId={sidebar.projects[index + 1]?.id ?? null}
					sidebar={sidebar}
					acts={acts}
					drag={drag}
				/>
			))}
		</Fragment>
	);
}
