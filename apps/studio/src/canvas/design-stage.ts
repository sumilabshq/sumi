import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { CANVAS_SOURCE, canvasPack, createCanvasState } from "@widgetarium/canvas";
import type { CanvasMode, CanvasSource, CanvasState, DesignSource, FrameSize, GpuSupply } from "@widgetarium/canvas";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { canvasBoardOf } from "./canvas-board.js";
import type { CanvasCorners } from "./canvas-board.js";
import { CANVAS_WIDGETS } from "./canvas-widgets.js";

export interface DesignViewState {
	readonly page: string;
	readonly isLayersOpen: boolean;
	readonly mode: CanvasMode;
}

export interface CanvasShell {
	readonly registry: ModuleRegistry;
	readonly host: SurfaceHost;
	readonly corners: CanvasCorners;
}

export interface DesignStageProps {
	// TODO: rename port → source, drop fieldOf, once hosts/obsidian design-view.ts follows
	readonly port: DesignSource;
	readonly app: string;
	readonly view: DesignViewState;
	readonly onView: (view: DesignViewState) => void;
	readonly size: FrameSize;
	readonly fieldOf?: (() => HTMLElement | null) | undefined;
	readonly ownsPaste?: (() => boolean) | undefined;
	readonly gpu?: GpuSupply | undefined;
	readonly shell?: CanvasShell | undefined;
}

export const DESIGN_OPENED_ON: DesignViewState = { page: "", isLayersOpen: false, mode: "hand" };

const CANVAS_REGISTRY = new ModuleRegistry(CANVAS_WIDGETS);
const STAGE = "cv:overflow-hidden cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px] cv:[&_.wg-tree-region]:p-0";

export function DesignStage({ port, app, view, onView, size, ownsPaste, gpu, shell }: DesignStageProps): ReactElement {
	useState(() => registerPacks(canvasPack));
	const state = useMemo(() => createCanvasState(view), [app]);
	useViewFollowed(state, view, onView);
	useViewportFollowed(state, size);
	const source = useMemo<CanvasSource>(
		() => ({ app, design: port, state, gpu: gpu ?? null, ownsPaste: ownsPaste ?? null }),
		[app, port, state, gpu, ownsPaste],
	);
	const host = useMemo<SurfaceHost>(
		() => ({ ...(shell?.host ?? port.drawing().host), sources: { [CANVAS_SOURCE]: source } }),
		[shell, port, source],
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

function useViewFollowed(state: CanvasState, view: DesignViewState, onView: (view: DesignViewState) => void): void {
	const told = useRef(onView);
	told.current = onView;
	useEffect(() => {
		const now = state.now();
		if (view.page !== now.page) state.change({ page: view.page, keptPage: view.page }, "the view asked for a page");
		if (view.isLayersOpen !== now.isLayersOpen) state.change({ isLayersOpen: view.isLayersOpen }, "the view asked");
		if (view.mode !== now.mode) state.change({ mode: view.mode }, "the view asked for a mode");
	}, [state, view.page, view.isLayersOpen, view.mode]);
	useEffect(
		() =>
			state.watch(["page", "isLayersOpen", "mode"], () => {
				const { page, isLayersOpen, mode } = state.now();
				told.current({ page, isLayersOpen, mode });
			}),
		[state],
	);
}

function useViewportFollowed(state: CanvasState, size: FrameSize): void {
	useEffect(() => state.change({ viewport: size }, "the canvas has new room"), [state, size.width, size.height]);
}
