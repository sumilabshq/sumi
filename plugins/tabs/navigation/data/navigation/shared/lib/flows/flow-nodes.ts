import type { Flow, FlowNode, FlowPane } from "../../schema/flows.schema.js";

export function panesOf(node: FlowNode): readonly FlowPane[] {
	if (node.kind === "pane") {
		return [node];
	}

	return node.children.flatMap(panesOf);
}

export function flowPanesOf(flow: Flow): readonly FlowPane[] {
	return panesOf(flow.layout.root);
}

export function flowTabIdsOf(flow: Flow): readonly string[] {
	return flowPanesOf(flow).flatMap((pane) => pane.tabIds);
}
