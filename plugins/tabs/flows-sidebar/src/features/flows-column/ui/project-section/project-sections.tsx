import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import { useProjectDraft } from "../../../../shared/lib/project-draft-request.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { RowField } from "../../../flow-rows/ui/row-field/row-field.js";
import { ProjectSection } from "./project-section.js";

const NEW_PROJECT = "New project";

export interface ProjectSectionsProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function ProjectSections({ sidebar, acts, drag }: ProjectSectionsProps): ReactElement {
	const [draft, clearDraft] = useProjectDraft();
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
			{draft === null ? null : (
				<section className="sumi-flows-section" aria-label={NEW_PROJECT}>
					<RowField
						name=""
						onCommit={(name) => acts.createProject(name, draft.flowId ?? undefined)}
						onDone={clearDraft}
					/>
				</section>
			)}
		</Fragment>
	);
}
