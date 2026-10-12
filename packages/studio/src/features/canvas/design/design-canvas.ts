import { createElement as h, useEffect, useMemo, useRef } from "react";
import type { DragEvent, ReactElement } from "react";
import { PRESSABLE_CONTROLS, usePanZoom } from "../stage/pan-zoom.js";
import { ZoomBar } from "../stage/zoom-bar.js";
import { useLayerFit } from "../stage/layer-fit.js";
import type { Size } from "../stage/frame-size.js";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { imageFilesIn } from "./design-photos.js";
import { regionsOfPage, shownPageOf } from "./design-canvas-page.js";
import { useFliesToWidget } from "./design-flies-to-widget.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { CanvasDoc } from "./design-docs.js";
import type { JobControls } from "./design-job.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { shownVariantOf } from "./design-variants.js";
import type { VariantPick } from "./design-variants.js";
import { LayersPanel } from "./design-layers-panel.js";
import type { LayerFocus } from "./design-layers-panel.js";
import { Highlight } from "./design-spotlight.js";
import { useCanvasSelection } from "./design-canvas-selection.js";
import type { CanvasMode } from "./design-tools.js";
import type { LayerMove } from "./layer-moves.js";
import { LookPanel } from "./design-look-panel.js";
import type { LookPick } from "./design-look-panel.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { GPU_PAGES } from "./gpu-pages.js";
import { usePageRenderer } from "./page-renderer.js";
import { useGpuPages } from "./use-gpu-pages.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly jobs: readonly Job[];
	readonly docs: readonly CanvasDoc[];
	readonly controls: JobControls;
	readonly opener: WidgetOpener;
	readonly pick: VariantPick;
	readonly look: Parsed<Look> | null;
	readonly onPickLook: LookPick;
	readonly focusWidget: string | null;
	readonly onFocusedWidget: () => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly page: string;
	readonly keptPage: string;
	readonly onPage: (page: string) => void;
	readonly isLayersOpen: boolean;
	readonly onLayers: () => void;
	readonly onMove: (widget: string, move: LayerMove) => void;
	readonly mode: CanvasMode;
	readonly onMode: (mode: CanvasMode) => void;
	readonly onReturn: () => void;
	readonly size: Size;
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

const HINT = "Answer a job on its page, or tell the agent in the chat";
const LAYERS_PANEL = ".wg-design-layers";
const PRESSABLE_IN_DESIGN = `${PRESSABLE_CONTROLS}, ${LAYERS_PANEL}, .wg-design-job`;

export function DesignCanvas(props: DesignCanvasProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const pan = usePanZoom(layerRef, useLayerFit(layerRef, props.size), {
		isHand: props.mode === "hand",
		pressable: PRESSABLE_IN_DESIGN,
		ownScroll: LAYERS_PANEL,
	});
	const selection = useCanvasSelection(layerRef, pan);
	const { screens, references, widgets, jobs, docs, controls, opener, pick, registry, host } = props;
	const page = shownPageOf(props.page, { screens, references, jobs, docs, keptPage: props.keptPage });
	useEscapeClears(selection.picked !== null, selection.clear);
	useFliesToWidget({ layerRef, pan, page, widget: props.focusWidget, onDone: props.onFocusedWidget });
	const regions = useMemo(
		() => regionsOfPage({ page, screens, references, widgets, jobs, docs, controls, opener, pick, registry, host }),
		[page, screens, references, widgets, jobs, docs, controls, opener, pick, registry, host],
	);
	const isPointer = props.mode === "pointer";
	const gpu = useGpuPages(usePageRenderer() === "gpu", layerRef, pan);
	const field = h(
		"div",
		{
			className: `wg-design-field wg-portal ${isPointer ? "is-pointer" : "is-hand"}`,
			ref: pan.fieldRef,
			...pan.moves,
			...(isPointer ? selection.pointing : {}),
			...photoDrops(props.onAddPhotos),
		},
		[
			h(
				"div",
				{ key: "layer", className: "wg-design-layer", ref: layerRef },
				regions,
				h(Highlight, { key: "hovered", spot: isPointer ? selection.hovered : null, tone: "hover" }),
				h(Highlight, { key: "picked", spot: selection.picked, tone: "picked" }),
			),
			gpu.canvas,
			layersOf(
				{ ...props, picked: selection.picked?.mark ?? null, onFocus: selection.onFocus, keepsLiveCopy: isPointer },
				page,
			),
			props.look ? h(LookPanel, { key: "look", read: props.look, onPick: props.onPickLook }) : null,
			h(ZoomBar, { key: "zoom", pan }),
			h("div", { key: "hint", className: "wg-design-hint" }, HINT),
		],
	);
	return h(GPU_PAGES.Provider, { value: gpu.pages }, field);
}

interface Picking {
	readonly picked: string | null;
	readonly onFocus: (focus: LayerFocus | null) => void;
	readonly keepsLiveCopy: boolean;
}

function layersOf(
	{ screens, pick, registry, isLayersOpen, onMove, picked, onFocus, keepsLiveCopy }: DesignCanvasProps & Picking,
	page: string,
): ReactElement | null {
	const [screen] = shownVariantOf(screens, page, pick);
	if (!screen) return null;
	return h(LayersPanel, {
		key: "layers-panel",
		screen,
		isOpen: isLayersOpen,
		keepsLiveCopy,
		registry,
		picked,
		onMove,
		onFocus,
	});
}

function useEscapeClears(isSet: boolean, clear: () => void): void {
	useEffect(() => {
		if (!isSet) return;
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") clear();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isSet, clear]);
}

function photoDrops(onAddPhotos: (photos: readonly File[]) => void) {
	return {
		onDragOver: (event: DragEvent): void => event.preventDefault(),
		onDrop: (event: DragEvent): void => {
			const photos = imageFilesIn(event.dataTransfer?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			onAddPhotos(photos);
		},
	};
}
