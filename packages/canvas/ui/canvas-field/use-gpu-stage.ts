import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { GpuFramesHost } from "@widgetarium/gpu";
import type { GpuSupply } from "@widgetarium/gpu";
import type { PanZoom } from "@widgetarium/behaviors";

export interface GpuStage {
	readonly frames: GpuFramesHost | null;
	readonly setCanvas: (canvas: HTMLCanvasElement | null) => void;
}

export function useGpuStage(
	supply: GpuSupply | null,
	layerRef: RefObject<HTMLDivElement | null>,
	pan: PanZoom,
): GpuStage {
	const [canvas, setShownCanvas] = useState<HTMLCanvasElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const lookNow = useRef(pan.lookNow);
	lookNow.current = pan.lookNow;
	const { watchLook } = pan;
	const frames = useMemo(
		() =>
			supply
				? new GpuFramesHost(supply, {
						layerOf: () => layerRef.current,
						canvasOf: () => canvasRef.current,
						lookNow: () => lookNow.current(),
						watchLook,
					})
				: null,
		[supply, layerRef, watchLook],
	);
	useEffect(() => {
		if (!frames || !canvas) return undefined;
		void frames.start(canvas);
		// TRADE-OFF: a window handle, because a GPU frame draws no DOM a test or a probe could read
		Object.assign(window, { __WG_GPU_FRAMES__: frames });
		return () => frames.stop();
	}, [frames, canvas]);
	const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
		canvasRef.current = node;
		setShownCanvas(node);
	}, []);
	return { frames, setCanvas };
}
