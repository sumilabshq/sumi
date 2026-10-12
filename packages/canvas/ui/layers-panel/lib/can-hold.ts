import type { Layer } from "../../layers/layer-tree.js";

export function canHoldChildren(layer: Layer): boolean {
	return layer.kind !== "widget" && layer.kind !== "input" && layer.kind !== "text" && layer.kind !== "picture";
}
