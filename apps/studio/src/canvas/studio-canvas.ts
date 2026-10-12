import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { FrameSize, GpuSupply } from "@widgetarium/canvas";
import type { ObsidianDesignHeld } from "@widgetarium/canvas";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { CANVAS_OPENED_ON, DesignStage } from "./design-stage.js";
import type { CanvasShell } from "./design-stage.js";

export interface StudioDesign {
	readonly app: string;
	readonly obsidian?: ObsidianDesignHeld | undefined;
	readonly gpu?: GpuSupply | undefined;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly project: StartedProject;
	readonly state: StudioState;
	readonly shell: CanvasShell;
}

export function StudioCanvas({ design, project, state, shell }: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<FrameSize | null>(null);
	useWatchesInnerSize(viewRef, setSize);
	const stage = size
		? h(DesignStage, {
				platform: design.obsidian ? "obsidian" : "web",
				obsidian: design.obsidian,
				project,
				returnToView: async () => state.show("app"),
				app: design.app,
				opening: CANVAS_OPENED_ON,
				size,
				gpu: design.gpu,
				shell,
			})
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
