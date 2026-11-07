import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { Runtime } from "@widgetarium/data-framework";
import type { CanvasSurroundings } from "../features/canvas/lib/canvas-surroundings.js";
import type { CanvasHosts } from "./canvas-hosts.js";
import { startCanvasApp } from "./canvas-app.js";
import { KeptCanvases } from "./kept-canvases.js";
import { CANVAS_OPENED_ON, DesignStage } from "./design-stage.js";
import type { CanvasShell, StageSize } from "./design-stage.js";

export interface StudioDesign {
	readonly app: string;
	readonly hostsOf: (project: StartedProject) => CanvasHosts;
	readonly surroundings: CanvasSurroundings;
	readonly canvases: KeptCanvases;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly project: StartedProject;
	readonly shell: CanvasShell;
	readonly tabId: string | null;
}

interface StagedCanvas {
	readonly props: StudioCanvasProps;
	readonly canvasApp: Runtime;
	readonly size: StageSize;
}

const STAYS_IN_ITS_TAB: CanvasSurroundings = {
	gpu: null,
	ownsPaste: () => true,
	returnTo: {
		kind: "view",
		open: async () => undefined,
	},
};

export function StudioCanvas(props: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<StageSize | null>(null);
	useWatchesInnerSize(viewRef, setSize);
	const canvasApp = useStartedCanvas(props.design, props.project, props.tabId);
	const stage = size ? drawDesignStage({ props, canvasApp, size }) : null;
	return h("div", { ref: viewRef, className: "cv:h-full cv:overflow-hidden", "data-canvas-studio": "" }, stage);
}

function drawDesignStage({ props, canvasApp, size }: StagedCanvas): ReactElement {
	return h(DesignStage, {
		app: props.design.app,
		opening: CANVAS_OPENED_ON,
		canvasApp,
		surroundings: props.design.surroundings,
		size,
		shell: props.shell,
	});
}

export function webStudioDesign(app: string): StudioDesign {
	return {
		app,
		hostsOf: (project) => ({ project }),
		surroundings: STAYS_IN_ITS_TAB,
		canvases: new KeptCanvases(),
	};
}

function useStartedCanvas(design: StudioDesign, project: StartedProject, tabId: string | null): Runtime {
	return useMemo(
		() => design.canvases.canvasOf(tabId ?? design.app, () => startCanvasApp(design.hostsOf(project), design.app)),
		[design, project, tabId],
	);
}

function useWatchesInnerSize(ref: { readonly current: HTMLElement | null }, onSize: (size: StageSize) => void): void {
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
