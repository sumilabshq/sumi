import { flowOfId, folderOfId, withFlowPlaced, withFolderChanged } from "../../../shared/lib/flows/flow-docs.js";
import type { FlowsPlan } from "../../../shared/lib/flows/flow-moves.js";
import {
	defaultBaseFolderOf,
	projectIdOfFlow,
	projectOfId,
	projectsOf,
	storedProjectIdOf,
	untitledProjectNameOf,
	withProjects,
} from "../../../shared/lib/flows/flow-projects.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type {
	CreateProjectAskSchema,
	MoveFlowToProjectAskSchema,
	MoveFolderToProjectAskSchema,
	ProjectAskSchema,
	RenameAskSchema,
	ReorderProjectsAskSchema,
	SetProjectBaseFolderAskSchema,
} from "../../../shared/schema/flow-asks.schema.js";
import { GENERAL_PROJECT_ID } from "../../../shared/schema/flows.schema.js";
import type { FlowsDoc, Project } from "../../../shared/schema/flows.schema.js";
import type { z } from "zod";

type CreateProjectAsk = z.infer<typeof CreateProjectAskSchema>;
type ProjectAsk = z.infer<typeof ProjectAskSchema>;
type RenameAsk = z.infer<typeof RenameAskSchema>;
type SetBaseFolderAsk = z.infer<typeof SetProjectBaseFolderAskSchema>;
type ReorderAsk = z.infer<typeof ReorderProjectsAskSchema>;
type MoveFlowAsk = z.infer<typeof MoveFlowToProjectAskSchema>;
type MoveFolderAsk = z.infer<typeof MoveFolderToProjectAskSchema>;

const NO_PROJECT = 'no project "{id}" stands here';
const NO_FLOW = 'no flow "{id}" stands here';
const NO_FOLDER = 'no folder "{id}" stands here';
const GENERAL_STAYS = "the General project always exists and cannot be deleted";
const NO_BEFORE = 'the project "{id}" is not in the list it is asked to stand before';

export function createProjectPlan(ask: CreateProjectAsk, id: string): FlowsPlan<{ readonly projectId: string }> {
	return ({ flows }) => {
		if (projectOfId(flows, id) !== undefined) {
			return { flows, reason: `project ${id} stands already, create skipped`, value: { projectId: id } };
		}

		if (ask.flowId !== undefined && flowOfId(flows, ask.flowId) === undefined) {
			return refusal(NO_FLOW.replace("{id}", ask.flowId));
		}

		const name = ask.name ?? untitledProjectNameOf(flows);
		const project: Project = { id, name, baseFolder: ask.baseFolder ?? defaultBaseFolderOf(name) };
		const created = withProjects(flows, [...projectsOf(flows), project]);
		const moved = ask.flowId === undefined ? created : withFlowInProject(created, ask.flowId, id);
		return {
			flows: moved,
			reason: `projects ${projectsOf(flows).length} → ${projectsOf(created).length} (create ${id} "${name}"${ask.flowId === undefined ? "" : `, flow ${ask.flowId} moved in`})`,
			value: { projectId: id },
		};
	};
}

export function renameProjectPlan({ id, name }: RenameAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const project = projectOfId(flows, id);

		if (project === undefined) {
			return refusal(NO_PROJECT.replace("{id}", id));
		}

		return {
			flows: project.name === name ? flows : withProjectChanged(flows, id, { name }),
			reason: `project ${id} name "${project.name}" → "${name}"`,
			value: null,
		};
	};
}

export function toggleProjectPlan({ id }: ProjectAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const project = projectOfId(flows, id);

		if (project === undefined) {
			return refusal(NO_PROJECT.replace("{id}", id));
		}

		const isCollapsed = project.isCollapsed ?? false;
		return {
			flows: withProjectChanged(flows, id, { isCollapsed: !isCollapsed }),
			reason: `project ${id} isCollapsed ${String(isCollapsed)} → ${String(!isCollapsed)}`,
			value: null,
		};
	};
}

export function setProjectBaseFolderPlan({ id, baseFolder }: SetBaseFolderAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const project = projectOfId(flows, id);

		if (project === undefined) {
			return refusal(NO_PROJECT.replace("{id}", id));
		}

		return {
			flows: project.baseFolder === baseFolder ? flows : withProjectChanged(flows, id, { baseFolder }),
			reason: `project ${id} baseFolder ${project.baseFolder} → ${baseFolder}`,
			value: null,
		};
	};
}

export function removeProjectPlan({ id }: ProjectAsk): FlowsPlan<null> {
	return ({ flows }) => {
		if (id === GENERAL_PROJECT_ID) {
			return refusal(GENERAL_STAYS);
		}

		if (projectOfId(flows, id) === undefined) {
			return refusal(NO_PROJECT.replace("{id}", id));
		}

		const homeless = flows.flows.filter((flow) => flow.projectId === id).length;
		const spilled = flows.folders.filter((folder) => folder.projectId === id).length;
		return {
			flows: {
				...withProjects(
					flows,
					projectsOf(flows).filter((project) => project.id !== id),
				),
				flows: flows.flows.map((flow) => (flow.projectId === id ? { ...flow, projectId: undefined } : flow)),
				folders: flows.folders.map((folder) =>
					folder.projectId === id ? { ...folder, projectId: undefined } : folder,
				),
			},
			reason: `project ${id} removed, ${homeless} flows and ${spilled} folders → ${GENERAL_PROJECT_ID}`,
			value: null,
		};
	};
}

export function reorderProjectsPlan({ id, before }: ReorderAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const projects = projectsOf(flows);
		const moved = projects.find((project) => project.id === id);

		if (moved === undefined) {
			return refusal(NO_PROJECT.replace("{id}", id));
		}

		if (before !== null && !projects.some((project) => project.id === before)) {
			return refusal(NO_BEFORE.replace("{id}", before));
		}

		if (before === id) {
			return { flows, reason: `project ${id} asked to stand before itself, reorder skipped`, value: null };
		}

		const rest = projects.filter((project) => project.id !== id);
		const at = before === null ? rest.length : rest.findIndex((project) => project.id === before);
		const next = [...rest.slice(0, at), moved, ...rest.slice(at)];
		const isSame = next.every((project, index) => project.id === projects[index]?.id);
		return {
			flows: isSame && flows.projects !== undefined ? flows : withProjects(flows, next),
			reason: `projects [${projects.map(({ id: one }) => one).join(", ")}] → [${next.map(({ id: one }) => one).join(", ")}]`,
			value: null,
		};
	};
}

export function moveFlowToProjectPlan({ flowId, projectId }: MoveFlowAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const flow = flowOfId(flows, flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", flowId));
		}

		if (projectOfId(flows, projectId) === undefined) {
			return refusal(NO_PROJECT.replace("{id}", projectId));
		}

		const from = projectIdOfFlow(flows, flow);
		return {
			flows: withFlowInProject(flows, flowId, projectId),
			reason: `flow ${flowId} project ${from} → ${projectId}`,
			value: null,
		};
	};
}

export function moveFolderToProjectPlan({ folderId, projectId }: MoveFolderAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, folderId);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", folderId));
		}

		if (projectOfId(flows, projectId) === undefined) {
			return refusal(NO_PROJECT.replace("{id}", projectId));
		}

		const next = storedProjectIdOf(projectId);
		return {
			flows: folder.projectId === next ? flows : withFolderChanged(flows, folderId, { projectId: next }),
			reason: `folder ${folderId} project ${folder.projectId ?? GENERAL_PROJECT_ID} → ${projectId}, its ${folder.flowIds.length} flows follow`,
			value: null,
		};
	};
}

function withFlowInProject(doc: FlowsDoc, flowId: string, projectId: string): FlowsDoc {
	const flow = flowOfId(doc, flowId);
	return flow === undefined || projectIdOfFlow(doc, flow) === projectId
		? doc
		: withFlowPlaced(doc, flowId, { folderId: null, before: null, projectId });
}

function withProjectChanged(doc: FlowsDoc, projectId: string, change: Partial<Project>): FlowsDoc {
	return withProjects(
		doc,
		projectsOf(doc).map((project) => (project.id === projectId ? { ...project, ...change } : project)),
	);
}
