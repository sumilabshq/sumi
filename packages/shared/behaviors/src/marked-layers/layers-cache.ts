import { layersIn } from "./layer-tree.js";
import type { Layer } from "./layer-tree.js";

const LAID = new WeakMap<Element, readonly Layer[]>();

export function cachedLayersIn(root: Element): readonly Layer[] {
	const known = LAID.get(root);
	if (known !== undefined) return known;
	const layers = layersIn(root);
	LAID.set(root, layers);
	const watcher = new MutationObserver(() => {
		LAID.delete(root);
		watcher.disconnect();
	});
	watcher.observe(root, { childList: true, subtree: true, attributes: true });
	return layers;
}
