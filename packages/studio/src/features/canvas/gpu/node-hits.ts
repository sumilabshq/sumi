import type { SceneNode } from "./scene-node.js";

export function collectHits(node: SceneNode, x: number, y: number, chain: SceneNode[]): boolean {
	if (node.style.display === "none") return false;
	const { box } = node;
	if (x < box.x || y < box.y || x >= box.x + box.w || y >= box.y + box.h) return false;
	chain.push(node);
	if (node.holdsShapes) return true;
	for (let at = node.children.length - 1; at >= 0; at -= 1) {
		const child = node.children[at];
		if (child && collectHits(child, x, y, chain)) break;
	}
	return true;
}
