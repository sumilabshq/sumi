import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Canvas, CanvasAppZone, TipSurface } from "@widgetarium/canvas";
import { CanvasClientModule } from "@widgetarium/canvas/module";
import type { CanvasParts } from "@widgetarium/canvas/gateways";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import { PlateHeaderPart } from "@widgetarium/shell";
import { useHandsCanvas } from "./use-hands-canvas.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasShell {
	readonly isInPlate: boolean;
}

export interface CanvasPageProps {
	readonly parts: CanvasParts;
	readonly shell: CanvasShell | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

export function CanvasPage({ parts, shell, onCanvas }: CanvasPageProps): ReactElement {
	const [canvasApp] = useState(() => createCanvasApp(parts));
	useHandsCanvas(canvasApp, onCanvas);
	return (
		<AppProvider app={canvasApp}>
			<OnRefused value={toastRefusal}>
				<Toaster />
				<TipSurface>
					<Canvas header={plateControlsOf(shell)} isInPlate={shell?.isInPlate ?? false} />
				</TipSurface>
			</OnRefused>
		</AppProvider>
	);
}

function plateControlsOf(shell: CanvasShell | undefined): ReactElement | undefined {
	if (shell?.isInPlate !== true) {
		return undefined;
	}

	return (
		<PlateHeaderPart place="controls">
			<CanvasAppZone look="ghost" />
		</PlateHeaderPart>
	);
}

function createCanvasApp(parts: CanvasParts): StartedApp {
	return app({ modules: [CanvasClientModule.with(parts)] });
}
