import { isHtmlTag } from "../nodes/node-flow.js";
import type { SceneNode } from "../nodes/scene-node.js";

const STAND_IN_TAG = "div";
const twinOfNode = new WeakMap<SceneNode, Element>();
const nodeOfTwin = new WeakMap<object, SceneNode>();

// TRADE-OFF: a ref gets a detached element, not the drawn node; its layout reads zero, but a portal into it lands on the node
export function publicTwinOf(node: SceneNode): Element | null {
	const known = twinOfNode.get(node);
	if (known) {
		return known;
	}

	if (typeof document === "undefined") {
		return null;
	}

	const twin = document.createElement(isHtmlTag(node.type) ? node.type : STAND_IN_TAG);
	twinOfNode.set(node, twin);
	nodeOfTwin.set(twin, node);
	return twin;
}

export function twinnedNodeOf(container: unknown): SceneNode | null {
	if (typeof container !== "object" || container === null) {
		return null;
	}

	return nodeOfTwin.get(container) ?? null;
}
