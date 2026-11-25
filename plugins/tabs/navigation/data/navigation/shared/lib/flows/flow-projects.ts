import { GENERAL_PROJECT_ID } from "../../schema/flows.schema.js";
import type { Flow, FlowFolder, FlowsDoc, Project } from "../../schema/flows.schema.js";

export const GENERAL_PROJECT: Project = {
	id: GENERAL_PROJECT_ID,
	name: "General",
	baseFolder: "~/Sumi/General",
};

export function defaultBaseFolderOf(name: string): string {
	return `~/Sumi/${name}`;
}

const UNTITLED_PROJECT = "Untitled project";

export function untitledProjectNameOf(doc: FlowsDoc): string {
	const taken = new Set(projectsOf(doc).map(({ name }) => name));
	const numbered = (number: number): string => (number === 1 ? UNTITLED_PROJECT : `${UNTITLED_PROJECT} ${number}`);
	let number = 1;

	while (taken.has(numbered(number))) {
		number += 1;
	}

	return numbered(number);
}

export function projectsOf(doc: FlowsDoc): readonly Project[] {
	const stored = doc.projects ?? [];
	return stored.some(({ id }) => id === GENERAL_PROJECT_ID) ? stored : [GENERAL_PROJECT, ...stored];
}

export function projectOfId(doc: FlowsDoc, projectId: string): Project | undefined {
	return projectsOf(doc).find(({ id }) => id === projectId);
}

export function projectIdOfFolder(folder: FlowFolder): string {
	return folder.projectId ?? GENERAL_PROJECT_ID;
}

export function projectIdOfFlow(doc: FlowsDoc, flow: Flow): string {
	const folder = doc.folders.find(({ flowIds }) => flowIds.includes(flow.id));
	return folder === undefined ? (flow.projectId ?? GENERAL_PROJECT_ID) : projectIdOfFolder(folder);
}

export function storedProjectIdOf(projectId: string): string | undefined {
	return projectId === GENERAL_PROJECT_ID ? undefined : projectId;
}

export function withProjects(doc: FlowsDoc, projects: readonly Project[]): FlowsDoc {
	return { ...doc, projects: [...projects] };
}
