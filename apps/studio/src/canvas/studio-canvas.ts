import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { DesignSource, FrameSize, GpuSupply } from "@widgetarium/canvas";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { DESIGN_OPENED_ON, DesignStage } from "./design-stage.js";
import type { CanvasShell } from "./design-stage.js";

export interface StudioDesign {
	readonly source: DesignSource;
	readonly app: string;
	readonly gpu?: GpuSupply | undefined;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly state: StudioState;
	readonly shell: CanvasShell;
}

export function StudioCanvas({ design, state, shell }: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<FrameSize | null>(null);
	const [view, setView] = useState(DESIGN_OPENED_ON);
	useWatchesInnerSize(viewRef, setSize);
	const port = useMemo<DesignSource>(
		() => ({ ...design.source, returnToView: async () => state.show("app") }),
		[design.source, state],
	);
	const stage = size
		? h(DesignStage, { port, app: design.app, view, onView: setView, size, gpu: design.gpu, shell })
		: null;
	return h("div", { ref: viewRef, className: "cv:h-full cv:overflow-hidden", "data-canvas-studio": "" }, stage);
}

function useWatchesInnerSize(ref: { readonly current: HTMLElement | null }, onSize: (size: FrameSize) => void): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const measure = (): void => {
			const size = { width: element.clientWidth, height: element.clientHeight };
			if (size.width > 0 && size.height > 0) onSize(size);
		};
		const watcher = new ResizeObserver(measure);
		watcher.observe(element);
		measure();
		return () => watcher.disconnect();
	}, [ref, onSize]);
}
