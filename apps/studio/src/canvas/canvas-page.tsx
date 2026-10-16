import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Canvas } from "@widgetarium/canvas";
import { canvasModule } from "@widgetarium/canvas/module";
import type { CanvasParts } from "@widgetarium/canvas/module";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import { useHandsCanvas } from "./use-hands-canvas.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasCorners {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

export interface CanvasPageProps {
	readonly parts: CanvasParts;
	readonly corners: CanvasCorners;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

export function CanvasPage({ parts, corners, onCanvas }: CanvasPageProps): ReactElement {
	const [canvasApp] = useState(() => app({ modules: [canvasModule.with(parts)] }));
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
