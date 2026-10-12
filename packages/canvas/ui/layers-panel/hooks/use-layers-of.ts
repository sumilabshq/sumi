import { useEffect, useState } from "react";
import { heldSeenLayers, isSeenAlready, keepSeenLayers } from "../../layers/seen-layers.js";
import { layersIn } from "../../layers/layer-tree.js";
import type { Layer } from "../../layers/layer-tree.js";

const REBUILT_AFTER_MS = 300;

export function useLayersOf(node: HTMLDivElement | null, key: string): readonly Layer[] | null {
	const [, setSeen] = useState(0);
	useEffect(() => {
		if (!node) return;
		let timer = 0;
		const rebuild = (): void => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				const layers = layersIn(node);
				if (layers.length === 0 || isSeenAlready(key, layers)) return;
				keepSeenLayers(key, layers);
				setSeen((count) => count + 1);
			}, REBUILT_AFTER_MS);
		};
		const watcher = new MutationObserver(rebuild);
		watcher.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-wg-node"] });
		rebuild();
		return () => {
			watcher.disconnect();
			window.clearTimeout(timer);
		};
	}, [node, key]);
	return heldSeenLayers(key);
}
