import type { Flow, FlowNode, FlowPane, FlowsDoc } from "../../schema/flows.schema.js";
import { flowPanesOf, flowTabIdsOf } from "./flow-nodes.js";

const TAB_NOT_ONE_PANE = 'the tab "{id}" stands in {count} panes: a live tab stands in exactly one pane of one flow';
const UNKNOWN_TAB = 'the flow "{flow}" holds the tab "{id}", which is no live tab';
const FLOW_NOT_ONE_PLACE = 'the flow "{id}" stands in {count} places: a flow stands in the loose list or in one folder';
const UNKNOWN_FLOW = 'the place "{place}" names the flow "{id}", which does not exist';
const REPEATED_ID = 'the {kind} id "{id}" is used {count} times';
const EMPTY_PANE = 'the pane "{pane}" of the flow "{flow}" is empty: only the sole pane of a flow may be';
const ACTIVE_NOT_IN_PANE = 'the pane "{pane}" of the flow "{flow}" shows "{id}", which it does not hold';
const NO_FOCUS = 'the flow "{flow}" focuses the pane "{pane}", which it does not have';
const SPLIT_SHARES =
	'the split "{split}" of the flow "{flow}" has {children} children and {shares} shares: a split holds two or more, one share each';

const NO_SESSION = "no session stands outside the archive: at least one always does";
const FLOW_WITHOUT_TAB = 'the flow "{id}" holds no tab: every flow holds at least one';
const WINDOW_ON_GONE = 'the window "{window}" shows the flow "{id}", which is gone or archived';

export function flowBreaksOf(doc: FlowsDoc, liveTabIds: readonly string[]): readonly string[] {
	return [...flowShapeBreaksOf(doc, liveTabIds), ...sessionBreaksOf(doc)];
}

function sessionBreaksOf(doc: FlowsDoc): readonly string[] {
	const isLive = (id: string): boolean => doc.flows.some((flow) => flow.id === id && flow.archivedAt === null);
	return [
		...(doc.flows.some(({ id }) => isLive(id)) ? [] : [NO_SESSION]),
		...doc.flows
			.filter((flow) => flowTabIdsOf(flow).length === 0)
			.map(({ id }) => FLOW_WITHOUT_TAB.replace("{id}", id)),
		...Object.entries(doc.windowFlows)
			.filter(([, id]) => !isLive(id))
			.map(([window, id]) => WINDOW_ON_GONE.replace("{window}", window).replace("{id}", id)),
	];
}

export function flowShapeBreaksOf(doc: FlowsDoc, liveTabIds: readonly string[]): readonly string[] {
	return [
		...repeatedIdsOf(doc),
		...tabPlacesBreaks(doc, liveTabIds),
		...flowPlacesBreaksOf(doc),
		...doc.flows.flatMap(flowLayoutBreaksOf),
	];
}

function countsOf(ids: readonly string[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();

	for (const id of ids) {
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return counts;
}

function repeatedIdsOf(doc: FlowsDoc): readonly string[] {
	const kinds = [
		{ kind: "flow", ids: doc.flows.map(({ id }) => id) },
		{ kind: "folder", ids: doc.folders.map(({ id }) => id) },
	];
	return kinds.flatMap(({ kind, ids }) =>
		[...countsOf(ids)]
			.filter(([, count]) => count > 1)
			.map(([id, count]) => REPEATED_ID.replace("{kind}", kind).replace("{id}", id).replace("{count}", String(count))),
	);
}

function tabPlacesBreaks(doc: FlowsDoc, liveTabIds: readonly string[]): readonly string[] {
	const counts = countsOf(doc.flows.flatMap(flowTabIdsOf));
	const live = new Set(liveTabIds);
	const notOnePane = liveTabIds
		.filter((id) => counts.get(id) !== 1)
		.map((id) => TAB_NOT_ONE_PANE.replace("{id}", id).replace("{count}", String(counts.get(id) ?? 0)));
	const unknown = doc.flows.flatMap((flow) =>
		flowTabIdsOf(flow)
			.filter((id) => !live.has(id))
			.map((id) => UNKNOWN_TAB.replace("{flow}", flow.id).replace("{id}", id)),
	);
	return [...notOnePane, ...unknown];
}

export function flowPlacesBreaksOf(doc: FlowsDoc): readonly string[] {
	const flowIds = new Set(doc.flows.map(({ id }) => id));
	const places = [
		{ place: "looseFlowIds", ids: doc.looseFlowIds },
		...doc.folders.map((folder) => ({ place: folder.id, ids: folder.flowIds })),
	];
	const counts = countsOf(places.flatMap(({ ids }) => ids));
	const unknown = places.flatMap(({ place, ids }) =>
		ids.filter((id) => !flowIds.has(id)).map((id) => UNKNOWN_FLOW.replace("{place}", place).replace("{id}", id)),
	);
	const notOnePlace = doc.flows
		.filter(({ id }) => counts.get(id) !== 1)
		.map(({ id }) => FLOW_NOT_ONE_PLACE.replace("{id}", id).replace("{count}", String(counts.get(id) ?? 0)));
	return [...notOnePlace, ...unknown];
}

export function flowLayoutBreaksOf(flow: Flow): readonly string[] {
	const panes = flowPanesOf(flow);
	return [
		...splitBreaksOf(flow, flow.layout.root),
		...panes.flatMap((pane) => paneBreaksOf(flow, pane, panes.length)),
		...(panes.some(({ id }) => id === flow.layout.focusedPaneId)
			? []
			: [NO_FOCUS.replace("{flow}", flow.id).replace("{pane}", flow.layout.focusedPaneId)]),
		...paneIdBreaksOf(
			flow,
			panes.map(({ id }) => id),
		),
	];
}

function paneBreaksOf(flow: Flow, pane: FlowPane, paneCount: number): readonly string[] {
	const emptyBreak =
		pane.tabIds.length === 0 && paneCount > 1 ? [EMPTY_PANE.replace("{pane}", pane.id).replace("{flow}", flow.id)] : [];
	const isActiveHeld = pane.activeTabId === null ? pane.tabIds.length === 0 : pane.tabIds.includes(pane.activeTabId);
	const activeBreak = isActiveHeld
		? []
		: [
				ACTIVE_NOT_IN_PANE.replace("{pane}", pane.id)
					.replace("{flow}", flow.id)
					.replace("{id}", pane.activeTabId ?? "nothing"),
			];
	return [...emptyBreak, ...activeBreak];
}

function paneIdBreaksOf(flow: Flow, paneIds: readonly string[]): readonly string[] {
	return [...countsOf(paneIds)]
		.filter(([, count]) => count > 1)
		.map(([id, count]) =>
			REPEATED_ID.replace("{kind}", `pane of ${flow.id}`).replace("{id}", id).replace("{count}", String(count)),
		);
}

function splitBreaksOf(flow: Flow, node: FlowNode): readonly string[] {
	if (node.kind === "pane") {
		return [];
	}

	const isShaped = node.children.length >= 2 && node.shares.length === node.children.length;
	const own = isShaped
		? []
		: [
				SPLIT_SHARES.replace("{split}", node.id)
					.replace("{flow}", flow.id)
					.replace("{children}", String(node.children.length))
					.replace("{shares}", String(node.shares.length)),
			];
	return [...own, ...node.children.flatMap((child) => splitBreaksOf(flow, child))];
}
