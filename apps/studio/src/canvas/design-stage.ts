import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { CANVAS_SOURCE, canvasPack, createCanvasState, showPage } from "@widgetarium/canvas";
import type { CanvasOpening, CanvasSource, CanvasState, DesignSource, FrameSize, GpuSupply } from "@widgetarium/canvas";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { canvasBoardOf } from "./canvas-board.js";
import type { CanvasCorners } from "./canvas-board.js";
import { CANVAS_WIDGETS } from "./canvas-widgets.js";

export interface CanvasShell {
	readonly registry: ModuleRegistry;
	readonly host: SurfaceHost;
	readonly corners: CanvasCorners;
}

export interface CanvasHandle {
	readonly showPage: (page: string) => void;
}

export interface DesignStageProps {
	readonly source: DesignSource;
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
	readonly size: FrameSize;
	readonly ownsPaste?: (() => boolean) | undefined;
	readonly gpu?: GpuSupply | undefined;
	readonly shell?: CanvasShell | undefined;
}

export const CANVAS_OPENED_ON: CanvasOpening = { page: "", isLayersOpen: false, mode: "hand" };

const CANVAS_REGISTRY = new ModuleRegistry(CANVAS_WIDGETS);
const STAGE = "cv:overflow-hidden cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px] cv:[&_.wg-tree-region]:p-0";

export function DesignStage({
	source: design,
	app,
	opening,
	onKept,
	onCanvas,
	size,
	ownsPaste,
	gpu,
	shell,
}: DesignStageProps): ReactElement {
	useState(() => registerPacks(canvasPack));
	const state = useMemo(() => createCanvasState(opening), [app]);
	useOpeningKept(state, onKept);
	useCanvasHandedOver(state, onCanvas);
	useViewportFollowed(state, size);
	const source = useMemo<CanvasSource>(
		() => ({ app, design, state, gpu: gpu ?? null, ownsPaste: ownsPaste ?? null }),
		[app, design, state, gpu, ownsPaste],
	);
	const host = useMemo<SurfaceHost>(
		() => ({ ...(shell?.host ?? design.drawing().host), sources: { [CANVAS_SOURCE]: source } }),
		[shell, design, source],
	);
	const [board, setBoard] = useState(() => normalizeBoard(canvasBoardOf(shell?.corners)));
	return h(
		"div",
		{ className: STAGE, style: { width: size.width, height: size.height }, "data-canvas-stage": "" },
		h(WidgetSurface, {
			board,
			registry: shell?.registry ?? CANVAS_REGISTRY,
			host,
			editing: false,
			isReadOnly: true,
			onChange: setBoard,
			initialWidth: size.width,
		}),
	);
}

function useOpeningKept(state: CanvasState, onKept: ((kept: CanvasOpening) => void) | undefined): void {
	const kept = useRef(onKept);
	kept.current = onKept;
	useEffect(
		() =>
			state.watch(["page", "isLayersOpen", "mode"], () => {
				const { page, isLayersOpen, mode } = state.now();
				kept.current?.({ page, isLayersOpen, mode });
			}),
		[state],
	);
}

function useCanvasHandedOver(state: CanvasState, onCanvas: ((canvas: CanvasHandle) => void) | undefined): void {
	useEffect(() => onCanvas?.({ showPage: (page) => showPage(state, page) }), [state, onCanvas]);
}

function useViewportFollowed(state: CanvasState, size: FrameSize): void {
	useEffect(() => state.change({ viewport: size }, "the canvas has new room"), [state, size.width, size.height]);
}
