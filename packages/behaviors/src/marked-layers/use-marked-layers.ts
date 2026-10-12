import { useEffect, useRef } from "react";
import { NODE_MARK } from "@widgetarium/core/engine/node-marks.js";
import { layersIn } from "./layer-tree.js";
import type { Layer } from "./layer-tree.js";

const REBUILT_AFTER_MS = 300;

export function useMarkedLayers(node: HTMLElement | null, onLayers: (layers: readonly Layer[]) => void): void {
	const told = useRef(onLayers);
	told.current = onLayers;
	useEffect(() => {
		if (!node) return undefined;
		let timer = 0;
		let seen = "";
		const rebuild = (): void => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				const layers = layersIn(node);
				const said = JSON.stringify(layers);
				if (layers.length === 0 || said === seen) return;
				seen = said;
				told.current(layers);
			}, REBUILT_AFTER_MS);
		};
		const watcher = new MutationObserver(rebuild);
		watcher.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: [NODE_MARK] });
		rebuild();
		return () => {
			watcher.disconnect();
			window.clearTimeout(timer);
		};
	}, [node]);
}
