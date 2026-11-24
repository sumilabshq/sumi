import type { Flow, FlowFolder, FlowsDoc } from "../../schema/flows.schema.js";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
}

const NO_FOLDER = 'no folder "{id}" stands here';
const NO_BEFORE = 'the flow "{id}" is not in the place it is asked to stand before';

export function flowOfId(doc: FlowsDoc, flowId: string): Flow | undefined {
	return doc.flows.find(({ id }) => id === flowId);
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
	const bare = withoutFlowPlace(doc, flowId);

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
	return {
		...doc,
		folders: doc.folders.filter(({ id }) => id !== folderId),
		looseFlowIds: [...doc.looseFlowIds, ...(folder?.flowIds ?? [])],
	};
}

export function placeProblemOf(doc: FlowsDoc, place: FlowPlace): string | null {
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
