import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { fitLook } from "@widgetarium/gpu";
import type { StageLook, StageSize } from "@widgetarium/gpu";

export function useLayerFit(
	layerRef: RefObject<HTMLElement | null>,
	viewRef: RefObject<HTMLElement | null>,
): StageLook | null {
	const [layer, setLayer] = useState<StageSize | null>(null);
	const [view, setView] = useState<StageSize | null>(null);
	useWatchesSize(layerRef, setLayer);
	useWatchesSize(viewRef, setView);
	return useMemo(() => (layer && view ? fitLook(layer, view) : null), [layer, view]);
}

function useWatchesSize(
	ref: RefObject<HTMLElement | null>,
	onSize: (size: (was: StageSize | null) => StageSize | null) => void,
): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const measure = (): void => {
			const size = { width: element.offsetWidth, height: element.offsetHeight };
			if (hasArea(size)) onSize((was) => (was && isSameSize(was, size) ? was : size));
		};
		const watcher = new ResizeObserver(measure);
		watcher.observe(element);
		measure();
		return () => watcher.disconnect();
	}, [ref, onSize]);
}

function hasArea({ width, height }: StageSize): boolean {
	return width > 0 && height > 0;
}

function isSameSize(a: StageSize, b: StageSize): boolean {
	return a.width === b.width && a.height === b.height;
}
