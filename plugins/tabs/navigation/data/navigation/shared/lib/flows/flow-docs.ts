import { GENERAL_PROJECT_ID } from "../../schema/flows.schema.js";
import type { Flow, FlowFolder, FlowsDoc } from "../../schema/flows.schema.js";
import { projectIdOfFlow, projectIdOfFolder, projectOfId, storedProjectIdOf } from "./flow-projects.js";
import { anchorOf, looseOfProject } from "./flow-top-level.js";
import type { TopItem } from "./flow-top-level.js";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
	readonly projectId?: string | null | undefined;
	readonly beforeFolder?: string | null | undefined;
}

export interface FolderPlace {
	readonly projectId: string;
	readonly before: TopItem | null;
}

const NO_FOLDER = 'no folder "{id}" stands here';
const NO_PROJECT = 'no project "{id}" stands here';
const NO_BEFORE_FOLDER = 'the folder "{id}" is not in the project it is asked to stand before';
const NO_BEFORE = 'the flow "{id}" is not in the place it is asked to stand before';

export function flowOfId(doc: FlowsDoc, flowId: string): Flow | undefined {
	return doc.flows.find(({ id }) => id === flowId);
}

export function isArchived(flow: Flow): boolean {
	return flow.archivedAt !== null;
}

export function folderOfId(doc: FlowsDoc, folderId: string): FlowFolder | undefined {
	return doc.folders.find(({ id }) => id === folderId);
}

export function folderHolding(doc: FlowsDoc, flowId: string): FlowFolder | undefined {
	return doc.folders.find((folder) => folder.flowIds.includes(flowId));
}

export function withFlowChanged(doc: FlowsDoc, flowId: string, change: Partial<Flow>): FlowsDoc {
	return {
		...doc,
		flows: doc.flows.map((flow) => (flow.id === flowId ? { ...flow, ...change } : flow)),
	};
}

export function withFolderChanged(doc: FlowsDoc, folderId: string, change: Partial<FlowFolder>): FlowsDoc {
	return {
		...doc,
		folders: doc.folders.map((folder) => (folder.id === folderId ? { ...folder, ...change } : folder)),
	};
}

export function withFlowPlaced(doc: FlowsDoc, flowId: string, place: FlowPlace): FlowsDoc {
	if (place.before === flowId) {
		return doc;
	}

	const bare = withProjectStored(
		withoutFlowPlace(doc, flowId),
		flowId,
		place.folderId === null ? storedProjectIdOf(projectIdAfter(doc, flowId, place)) : undefined,
	);

	if (place.folderId === null && typeof place.beforeFolder === "string") {
		return withFlowBeforeFolder(bare, flowId, place.beforeFolder);
	}

	if (place.folderId === null) {
		return {
			...bare,
			looseFlowIds: insertedBefore(bare.looseFlowIds, flowId, place.before),
		};
	}

	return withFolderChanged(bare, place.folderId, {
		flowIds: insertedBefore(folderOfId(bare, place.folderId)?.flowIds ?? [], flowId, place.before),
	});
}

export function withFlowAdded(doc: FlowsDoc, flow: Flow, place: FlowPlace): FlowsDoc {
	return withFlowPlaced({ ...doc, flows: [...doc.flows, flow] }, flow.id, place);
}

export function withoutFlow(doc: FlowsDoc, flowId: string): FlowsDoc {
	const bare = withoutFlowPlace(doc, flowId);
	return {
		...bare,
		flows: bare.flows.filter(({ id }) => id !== flowId),
		windowFlows: Object.fromEntries(Object.entries(bare.windowFlows).filter(([, id]) => id !== flowId)),
	};
}

export function withFolderRemoved(doc: FlowsDoc, folderId: string): FlowsDoc {
	const folder = folderOfId(doc, folderId);
	const spilled = new Set(folder?.flowIds ?? []);
	return {
		...doc,
		folders: doc.folders.filter(({ id }) => id !== folderId),
		flows: doc.flows.map((flow) =>
			spilled.has(flow.id) && flow.projectId !== folder?.projectId ? { ...flow, projectId: folder?.projectId } : flow,
		),
		looseFlowIds: [...doc.looseFlowIds, ...(folder?.flowIds ?? [])],
	};
}

export function placeProblemOf(doc: FlowsDoc, place: FlowPlace): string | null {
	if (typeof place.projectId === "string" && projectOfId(doc, place.projectId) === undefined) {
		return NO_PROJECT.replace("{id}", place.projectId);
	}

	if (place.folderId === null && typeof place.beforeFolder === "string") {
		return folderOfId(doc, place.beforeFolder) === undefined ? NO_FOLDER.replace("{id}", place.beforeFolder) : null;
	}

	if (place.folderId === null) {
		return place.before === null || doc.looseFlowIds.includes(place.before)
			? null
			: NO_BEFORE.replace("{id}", place.before);
	}

	const folder = folderOfId(doc, place.folderId);

	if (folder === undefined) {
		return NO_FOLDER.replace("{id}", place.folderId);
	}

	return place.before === null || folder.flowIds.includes(place.before)
		? null
		: NO_BEFORE.replace("{id}", place.before);
}

function withProjectStored(doc: FlowsDoc, flowId: string, projectId: string | undefined): FlowsDoc {
	return flowOfId(doc, flowId)?.projectId === projectId ? doc : withFlowChanged(doc, flowId, { projectId });
}

function projectIdAfter(doc: FlowsDoc, flowId: string, place: FlowPlace): string {
	const beforeFolder = typeof place.beforeFolder === "string" ? folderOfId(doc, place.beforeFolder) : undefined;

	if (beforeFolder !== undefined) {
		return projectIdOfFolder(beforeFolder);
	}

	if (place.projectId !== undefined) {
		return place.projectId ?? GENERAL_PROJECT_ID;
	}

	const flow = flowOfId(doc, flowId);
	return flow === undefined ? GENERAL_PROJECT_ID : projectIdOfFlow(doc, flow);
}

function withoutFlowPlace(doc: FlowsDoc, flowId: string): FlowsDoc {
	const next = nextLooseOf(doc, flowId);
	const projectId = projectIdOfLoose(doc, flowId);
	return {
		...doc,
		looseFlowIds: doc.looseFlowIds.filter((id) => id !== flowId),
		folders: doc.folders.map((folder) => ({
			...folder,
			flowIds: folder.flowIds.filter((id) => id !== flowId),
			...(folder.before === flowId ? { before: projectIdOfFolder(folder) === projectId ? next : null } : {}),
		})),
	};
}

function projectIdOfLoose(doc: FlowsDoc, flowId: string): string | null {
	const flow = flowOfId(doc, flowId);
	return flow === undefined ? null : projectIdOfFlow(doc, flow);
}

function nextLooseOf(doc: FlowsDoc, flowId: string): string | null {
	const projectId = projectIdOfLoose(doc, flowId);

	if (projectId === null) {
		return null;
	}

	const loose = looseOfProject(doc, projectId);
	return loose[loose.indexOf(flowId) + 1] ?? null;
}

function withFlowBeforeFolder(bare: FlowsDoc, flowId: string, folderId: string): FlowsDoc {
	const folder = folderOfId(bare, folderId);

	if (folder === undefined) {
		return bare;
	}

	const projectId = projectIdOfFolder(folder);
	const loose = looseOfProject(bare, projectId);
	const anchor = anchorOf(folder, loose);
	const gapAt = bare.folders.indexOf(folder);
	return {
		...bare,
		looseFlowIds: insertedBefore(bare.looseFlowIds, flowId, anchor),
		folders: bare.folders.map((one, at) =>
			at < gapAt && projectIdOfFolder(one) === projectId && anchorOf(one, loose) === anchor
				? { ...one, before: flowId }
				: one,
		),
	};
}

export function withFolderPlaced(doc: FlowsDoc, folderId: string, { projectId, before }: FolderPlace): FlowsDoc {
	const folder = folderOfId(doc, folderId);

	if (folder === undefined) {
		return doc;
	}

	const others = doc.folders.filter(({ id }) => id !== folderId);
	const target = before?.kind === "folder" ? folderOfId(doc, before.id) : undefined;
	const loose = looseOfProject(doc, projectId);
	const anchor = target === undefined ? (before?.id ?? null) : anchorOf(target, loose);
	const placed: FlowFolder = { ...folder, projectId: storedProjectIdOf(projectId), before: anchor };
	const at = target === undefined ? others.length : others.findIndex(({ id }) => id === target.id);
	return { ...doc, folders: [...others.slice(0, at), placed, ...others.slice(at)] };
}

export function folderPlaceProblemOf(
	doc: FlowsDoc,
	folderId: string,
	{ projectId, before }: FolderPlace,
): string | null {
	if (folderOfId(doc, folderId) === undefined) {
		return NO_FOLDER.replace("{id}", folderId);
	}

	if (projectOfId(doc, projectId) === undefined) {
		return NO_PROJECT.replace("{id}", projectId);
	}

	if (before === null) {
		return null;
	}

	if (before.kind === "flow") {
		return looseOfProject(doc, projectId).includes(before.id) ? null : NO_BEFORE.replace("{id}", before.id);
	}

	const target = folderOfId(doc, before.id);
	return target !== undefined && projectIdOfFolder(target) === projectId
		? null
		: NO_BEFORE_FOLDER.replace("{id}", before.id);
}

function insertedBefore(ids: readonly string[], id: string, before: string | null): string[] {
	const at = before === null ? -1 : ids.indexOf(before);
	const cut = at === -1 ? ids.length : at;
	return [...ids.slice(0, cut), id, ...ids.slice(cut)];
}
