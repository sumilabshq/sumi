import { useCallback } from "react";
import type { RefCallback } from "react";
import type { SizeWatcher } from "./area-placement.js";

export function useObservedElement(watcher: SizeWatcher): RefCallback<HTMLDivElement> {
	return useCallback(
		(element: HTMLDivElement | null): (() => void) | undefined =>
			element === null ? undefined : watchSizeOf(element, watcher),
		[watcher],
	);
}

function watchSizeOf(element: HTMLDivElement, watcher: SizeWatcher): () => void {
	watcher.attach(element);
	const observed = new ResizeObserver(() => watcher.resize());
	observed.observe(element);
	watcher.resize();
	return () => {
		observed.disconnect();
		watcher.detach();
	};
}
