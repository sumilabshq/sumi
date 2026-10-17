import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { FrameSize } from "@widgetarium/canvas";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { CanvasHost, detachedHostOf, webCanvasParts } from "@widgetarium/canvas/gateways";
import type { CanvasParts } from "@widgetarium/canvas/gateways";
import { CANVAS_OPENED_ON, DesignStage } from "./design-stage.js";
import type { CanvasShell, StageMount } from "./design-stage.js";

export interface StudioMount extends StageMount {
	readonly project: StartedProject;
}

export interface StudioDesign {
	readonly app: string;
	readonly partsOf: (mount: StudioMount) => CanvasParts;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly project: StartedProject;
	readonly shell: CanvasShell;
}

export function StudioCanvas({ design, project, shell }: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<FrameSize | null>(null);
	useWatchesInnerSize(viewRef, setSize);
	const stage = size
		? h(DesignStage, {
				app: design.app,
				opening: CANVAS_OPENED_ON,
				partsOf: (mount) => design.partsOf({ ...mount, project }),
				size,
				shell,
			})
		: null;
	return h("div", { ref: viewRef, className: "cv:h-full cv:overflow-hidden", "data-canvas-studio": "" }, stage);
}

export function webStudioDesign(app: string): StudioDesign {
	return {
		app,
		partsOf: ({ project, ...mount }) =>
			webCanvasParts(
				project,
				new CanvasHost({
					...detachedHostOf(mount.opened),
					...mount,
					ownsPaste: ownsEveryPasteInItsTab,
					gpu: null,
				}),
			),
	};
}

function ownsEveryPasteInItsTab(): boolean {
	return true;
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
