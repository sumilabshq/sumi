import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Canvas, canvasModule } from "@widgetarium/canvas";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/mediator";
import type { AnyHost, AppPlatform, Module } from "@widgetarium/core/mediator";
import { Toaster } from "@widgetarium/kit";
import { useHandsCanvas } from "./use-hands-canvas.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasCorners {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

export interface CanvasPageProps {
	readonly host: AnyHost;
	readonly corners: CanvasCorners;
	readonly modules?: readonly Module[] | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

const CANVAS_MODULES: readonly Module[] = [canvasModule];
const STUDIO_PLATFORMS: readonly AppPlatform[] = ["obsidian", "web"];

export function CanvasPage({ host, corners, modules = CANVAS_MODULES, onCanvas }: CanvasPageProps): ReactElement {
	const [canvasApp] = useState(() => app({ modules, platforms: STUDIO_PLATFORMS, host }));
	useHandsCanvas(canvasApp, onCanvas);
	return (
		<AppProvider app={canvasApp}>
			<OnRefused value={toastRefusal}>
				<Toaster />
				<Canvas cornersStart={corners.start} cornersEnd={corners.end} />
			</OnRefused>
		</AppProvider>
	);
}
