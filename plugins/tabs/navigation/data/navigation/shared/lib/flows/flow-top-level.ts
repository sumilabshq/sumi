import type { FlowFolder, FlowsDoc } from "../../schema/flows.schema.js";
import { projectIdOfFlow, projectIdOfFolder } from "./flow-projects.js";

export interface TopItem {
	readonly kind: "flow" | "folder";
	readonly id: string;
}

export function looseOfProject(doc: FlowsDoc, projectId: string): readonly string[] {
	return doc.looseFlowIds.filter((id) => {
		const flow = doc.flows.find((one) => one.id === id);
		return flow !== undefined && projectIdOfFlow(doc, flow) === projectId;
	});
}

export function anchorOf(folder: FlowFolder, loose: readonly string[]): string | null {
	return folder.before !== undefined && folder.before !== null && loose.includes(folder.before) ? folder.before : null;
}

export function topLevelOf(doc: FlowsDoc, projectId: string): readonly TopItem[] {
	const loose = looseOfProject(doc, projectId);
	const folders = doc.folders.filter((folder) => projectIdOfFolder(folder) === projectId);
	const anchoredTo = (id: string | null): TopItem[] =>
		folders
			.filter((folder) => anchorOf(folder, loose) === id)
			.map(({ id: folderId }) => ({ kind: "folder", id: folderId }));
	return [...loose.flatMap((id): TopItem[] => [...anchoredTo(id), { kind: "flow", id }]), ...anchoredTo(null)];
}
