import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { dragKeyOf, folderKeyOf, projectKeyOf } from "../../../../shared/lib/flow-drag.js";
import type { DropTarget, FlowDrag } from "../../../../shared/lib/flow-drag.js";
import { NEW_SESSION, newSessionPlaceOf } from "../../../../shared/lib/flow-facts.js";
import type {
	FlowRowFacts,
	FlowsSidebarFacts,
	FolderRowFacts,
	ProjectFacts,
} from "../../../../shared/lib/flow-facts.js";
import type { FlowActs, TopRef } from "../../../../shared/lib/use-flow-acts.js";
import { FlowRowView } from "../../../flow-rows/ui/flow-row/flow-row.js";
import { FolderRowView } from "../../../flow-rows/ui/folder-row/folder-row.js";
import { useProjectRenaming } from "../../../../shared/lib/project-rename-request.js";
import { RowField } from "../../../flow-rows/ui/row-field/row-field.js";
import { ProjectHeading } from "./project-heading.js";

const PLUS_PX = 13;

export interface ProjectSectionProps {
	readonly project: ProjectFacts;
	readonly nextProjectId: string | null;
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function ProjectSection({ project, nextProjectId, sidebar, acts, drag }: ProjectSectionProps): ReactElement {
	const [isRenaming, setIsRenaming] = useProjectRenaming(project.id);
	const flows = new Map(sidebar.looseFlows.map((flow) => [flow.id, flow]));
	const folders = new Map(sidebar.folders.map((folder) => [folder.id, folder]));
	const target: DropTarget = { kind: "project", projectId: project.id, nextProjectId };
	const newSession = (): void => acts.create(NEW_SESSION, newSessionPlaceOf(sidebar, project.id));
	return (
		<section
			className="sumi-flows-section"
			aria-label={project.name}
			data-project={project.id}
			data-drop={drag.containerKey === projectKeyOf(project.id) ? "" : undefined}
			data-dragging={drag.draggingKey === dragKeyOf({ kind: "project", id: project.id }) ? "" : undefined}
			{...drag.targetProps(target)}
		>
			{isRenaming ? (
				<RowField
					name={project.name}
					onCommit={(name) => acts.renameProject(project.id, name)}
					onDone={() => setIsRenaming(false)}
				/>
			) : (
				<ProjectHeading
					project={project}
					acts={acts}
					drag={drag}
					onToggle={() => acts.toggleProject(project.id)}
					onNewSession={newSession}
					onRename={() => setIsRenaming(true)}
				/>
			)}
			{project.isCollapsed
				? null
				: project.items.map((item, at) => {
						const nextTop = project.items[at + 1] ?? null;
						const flow = item.kind === "flow" ? flows.get(item.id) : undefined;
						const folder = item.kind === "folder" ? folders.get(item.id) : undefined;

						if (flow !== undefined) {
							return (
								<FlowRowView
									key={flow.id}
									flow={flow}
									nextFlowId={null}
									nextTop={nextTop}
									folderId={null}
									projectId={project.id}
									isCurrent={flow.id === sidebar.windowFlowId}
									sidebar={sidebar}
									acts={acts}
									drag={drag}
								/>
							);
						}

						return folder === undefined ? null : (
							<FolderBlock
								key={folder.id}
								folder={folder}
								nextTop={nextTop}
								project={project}
								sidebar={sidebar}
								acts={acts}
								drag={drag}
							/>
						);
					})}
			{!project.isCollapsed && project.items.length === 0 ? (
				<div className="sumi-flows-row" data-kind="new">
					<button type="button" className="sumi-flows-row-main sumi-flows-row-empty" onClick={newSession}>
						<span className="sumi-flows-glyph">
							<Icon name="plus" size={PLUS_PX} />
						</span>
						<span className="sumi-flows-name">{NEW_SESSION}</span>
					</button>
				</div>
			) : null}
		</section>
	);
}

interface FolderBlockProps {
	readonly folder: FolderRowFacts;
	readonly nextTop: TopRef | null;
	readonly project: ProjectFacts;
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

function FolderBlock({ folder, nextTop, project, sidebar, acts, drag }: FolderBlockProps): ReactElement {
	return (
		<div className="sumi-flows-folder" data-drop={drag.containerKey === folderKeyOf(folder.id) ? "" : undefined}>
			<FolderRowView folder={folder} nextTop={nextTop} acts={acts} drag={drag} />
			{folder.isOpen
				? folder.flows.map((flow: FlowRowFacts, at) => (
						<FlowRowView
							key={flow.id}
							flow={flow}
							nextFlowId={folder.flows[at + 1]?.id ?? null}
							nextTop={nextTop}
							folderId={folder.id}
							projectId={project.id}
							isCurrent={flow.id === sidebar.windowFlowId}
							sidebar={sidebar}
							acts={acts}
							drag={drag}
						/>
					))
				: null}
		</div>
	);
}
