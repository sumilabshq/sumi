import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AppHostBar, AppHostFrame } from "@widgetarium/app-host";
import { AppHostClientModule } from "@widgetarium/app-host/module";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import { Canvas, CanvasAppZone } from "@widgetarium/canvas";
import { CanvasClientModule } from "@widgetarium/canvas/module";
import type { CanvasParts } from "@widgetarium/canvas/gateways";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import { useHandsCanvas } from "./use-hands-canvas.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasShell {
	readonly hostParts: AppHostParts;
	readonly cornerEnd: ReactNode;
}

export interface CanvasPageProps {
	readonly parts: CanvasParts;
	readonly shell: CanvasShell | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

export function CanvasPage({ parts, shell, onCanvas }: CanvasPageProps): ReactElement {
	const [canvasApp] = useState(() => createCanvasApp(parts, shell));
	useHandsCanvas(canvasApp, onCanvas);
	const header = shell ? <AppHostBar appZone={<CanvasAppZone />} cornerEnd={shell.cornerEnd} /> : undefined;
	return (
		<AppProvider app={canvasApp}>
			<OnRefused value={toastRefusal}>
				<Toaster />
				{shell ? (
					<AppHostFrame>
						<Canvas header={header} />
					</AppHostFrame>
				) : (
					<Canvas header={header} />
				)}
			</OnRefused>
		</AppProvider>
	);
}

function createCanvasApp(parts: CanvasParts, shell: CanvasShell | undefined): StartedApp {
	const canvas = CanvasClientModule.with(parts);
	if (!shell) {
		return app({ modules: [canvas] });
	}

	return app({ modules: [canvas, AppHostClientModule.with(shell.hostParts)] });
}
