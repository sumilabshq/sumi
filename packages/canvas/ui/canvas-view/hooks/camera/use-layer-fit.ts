import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { fitLook } from "@widgetarium/gpu";
import type { StageLook, StageSize } from "@widgetarium/gpu";

export function useLayerFit(layerRef: RefObject<HTMLElement | null>, view: StageSize): StageLook | null {
	const [layer, setLayer] = useState<StageSize | null>(null);
	useWatchesSize(layerRef, setLayer);
	return useMemo(() => (layer && hasArea(view) ? fitLook(layer, view) : null), [layer, view]);
}

function useWatchesSize(ref: RefObject<HTMLElement | null>, onSize: (size: StageSize) => void): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const measure = (): void => {
			const size = { width: element.offsetWidth, height: element.offsetHeight };
			if (hasArea(size)) onSize(size);
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
