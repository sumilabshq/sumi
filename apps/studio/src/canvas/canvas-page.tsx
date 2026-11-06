import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { CanvasOpeningQuery, OpenCanvasCommand } from "@widgetarium/canvas";
import type { CanvasOpened, CanvasOpening } from "@widgetarium/canvas";
import { AppProvider, OnRefused, toastRefusal, useQuery } from "@widgetarium/framework";
import type { StartedApp } from "@widgetarium/framework";
import { Toaster } from "@widgetarium/kit";
import { PlateHeaderPart } from "../features/plate/ui/plate-header/plate-header-part.js";
import { Canvas } from "../features/canvas/ui/canvas/canvas.js";
import { CanvasAppZone } from "../features/canvas/ui/canvas-app-zone/canvas-app-zone.js";
import { TipSurface } from "../features/canvas/ui/tip-surface/tip-surface.js";
import { CanvasSurroundingsContext } from "../features/canvas/lib/canvas-surroundings.js";
import type { CanvasSurroundings } from "../features/canvas/lib/canvas-surroundings.js";
import { useHandsCanvas } from "./use-hands-canvas.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasShell {
	readonly isInPlate: boolean;
}

export interface CanvasPageProps {
	readonly canvasApp: StartedApp;
	readonly opened: CanvasOpened;
	readonly surroundings: CanvasSurroundings;
	readonly shell: CanvasShell | undefined;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

export function CanvasPage({
	canvasApp,
	opened,
	surroundings,
	shell,
	onKept,
	onCanvas,
}: CanvasPageProps): ReactElement | null {
	const isOpen = useOpensCanvas(canvasApp, opened);
	useHandsCanvas(canvasApp, onCanvas);

	if (!isOpen) {
		return null;
	}

	return (
		<AppProvider app={canvasApp}>
			<CanvasSurroundingsContext value={surroundings}>
				<OnRefused value={toastRefusal}>
					<Toaster />
					<KeptOpening onKept={onKept} />
					<TipSurface>
						<Canvas header={plateControlsOf(shell)} isInPlate={shell?.isInPlate ?? false} />
					</TipSurface>
				</OnRefused>
			</CanvasSurroundingsContext>
		</AppProvider>
	);
}

function KeptOpening({ onKept }: { readonly onKept: ((kept: CanvasOpening) => void) | undefined }): null {
	const opening = useQuery(CanvasOpeningQuery).data;
	const told = useRef(opening);
	useEffect(() => {
		if (told.current === opening) {
			return;
		}

		told.current = opening;
		onKept?.(opening);
	}, [opening, onKept]);
	return null;
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

function useOpensCanvas(canvasApp: StartedApp, opened: CanvasOpened): boolean {
	const [isOpen, setOpen] = useState(false);
	useEffect(() => {
		void canvasApp.send(OpenCanvasCommand, opened).then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] the canvas of ${opened.app} did not open: ${answer.reason}`);
			}

			setOpen(true);
		});
	}, [canvasApp]);
	return isOpen;
}
