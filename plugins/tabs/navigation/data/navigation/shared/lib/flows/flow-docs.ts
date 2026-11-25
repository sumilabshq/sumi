import { GENERAL_PROJECT_ID } from "../../schema/flows.schema.js";
import type { Flow, FlowFolder, FlowsDoc } from "../../schema/flows.schema.js";
import { projectIdOfFlow, projectOfId, storedProjectIdOf } from "./flow-projects.js";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
	readonly projectId?: string | null | undefined;
}

const NO_FOLDER = 'no folder "{id}" stands here';
const NO_PROJECT = 'no project "{id}" stands here';
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
	if (place.projectId !== undefined) {
		return place.projectId ?? GENERAL_PROJECT_ID;
	}

	const flow = flowOfId(doc, flowId);
	return flow === undefined ? GENERAL_PROJECT_ID : projectIdOfFlow(doc, flow);
}

function withoutFlowPlace(doc: FlowsDoc, flowId: string): FlowsDoc {
	return {
		...doc,
		looseFlowIds: doc.looseFlowIds.filter((id) => id !== flowId),
		folders: doc.folders.map((folder) => ({
			...folder,
			flowIds: folder.flowIds.filter((id) => id !== flowId),
		})),
	};
}

function insertedBefore(ids: readonly string[], id: string, before: string | null): string[] {
	const at = before === null ? -1 : ids.indexOf(before);
	const cut = at === -1 ? ids.length : at;
	return [...ids.slice(0, cut), id, ...ids.slice(cut)];
}
