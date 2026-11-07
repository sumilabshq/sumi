import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { Runtime } from "@widgetarium/data-framework";
import type { CanvasSurroundings } from "../features/canvas/lib/canvas-surroundings.js";
import type { CanvasHosts } from "./canvas-hosts.js";
import { startCanvasApp } from "./canvas-app.js";
import { CANVAS_OPENED_ON, DesignStage } from "./design-stage.js";
import type { CanvasShell, StageSize } from "./design-stage.js";

export interface StudioDesign {
	readonly app: string;
	readonly hostsOf: (project: StartedProject) => CanvasHosts;
	readonly surroundings: CanvasSurroundings;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly project: StartedProject;
	readonly shell: CanvasShell;
}

const STAYS_IN_ITS_TAB: CanvasSurroundings = {
	gpu: null,
	ownsPaste: () => true,
	returnTo: {
		kind: "view",
		open: async () => undefined,
	},
};

export function StudioCanvas({ design, project, shell }: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<StageSize | null>(null);
	useWatchesInnerSize(viewRef, setSize);
	const canvasApp = useStartedCanvas(design, project);
	const stage =
		size && canvasApp
			? h(DesignStage, {
					app: design.app,
					opening: CANVAS_OPENED_ON,
					canvasApp,
					surroundings: design.surroundings,
					size,
					shell,
				})
			: null;
	return h("div", { ref: viewRef, className: "cv:h-full cv:overflow-hidden", "data-canvas-studio": "" }, stage);
}

export function webStudioDesign(app: string): StudioDesign {
	return {
		app,
		hostsOf: (project) => ({ project }),
		surroundings: STAYS_IN_ITS_TAB,
	};
}

function useStartedCanvas(design: StudioDesign, project: StartedProject): Runtime | null {
	const [canvasApp, setCanvasApp] = useState<Runtime | null>(null);
	const { app, hostsOf } = design;
	useEffect(() => {
		const started = startCanvasApp(hostsOf(project), app);
		setCanvasApp(started);
		return () => started.stop();
	}, [app, hostsOf, project]);
	return canvasApp;
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
