import { createElement as h, useContext, useEffect, useMemo, useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { PanZoom } from "../local/pan-zoom.js";
import { GPU_SUPPLY } from "./gpu-supply.js";
import { GpuPagesHost } from "./gpu-pages-host.js";

export interface GpuPagesDrawn {
	readonly pages: GpuPagesHost | null;
	readonly canvas: ReactElement | null;
}

export function useGpuPages(isOn: boolean, layerRef: RefObject<HTMLDivElement | null>, pan: PanZoom): GpuPagesDrawn {
	const supply = useContext(GPU_SUPPLY);
	const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
	const { lookNow, watchLook } = pan;
	const lookRef = useLatest(lookNow);
	const pages = useMemo(
		() =>
			isOn && supply
				? new GpuPagesHost(supply, { layerOf: () => layerRef.current, lookNow: () => lookRef.current(), watchLook })
				: null,
		[isOn, supply, layerRef, lookRef, watchLook],
	);
	useEffect(() => {
		if (!pages || !canvas) return undefined;
		void pages.start(canvas);
		// TRADE-OFF: a window handle, because a GPU frame draws no DOM a test or a probe could read
		Object.assign(window, { __WG_GPU_PAGES__: pages });
		return () => pages.stop();
	}, [pages, canvas]);
	return { pages, canvas: pages ? h("canvas", { key: "gpu", ref: setCanvas, className: "wg-design-gpu" }) : null };
}

function useLatest<T>(value: T): { readonly current: T } {
	const [held] = useState(() => ({ current: value }));
	held.current = value;
	return held;
}
