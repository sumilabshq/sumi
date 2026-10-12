import { createElement as h, useCallback, useMemo, useRef } from "react";
import type { DragEvent, ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import type { Camera } from "../../schemas/camera.schema.js";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import type { FrameSize } from "../../schemas/frame-size.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import type { CanvasMode, PageRenderer } from "../../schemas/canvas-view.schema.js";
import { imageFilesIn } from "../image-files/image-files.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import type { Act } from "../said-line/use-refusal.js";
import { useFliesToWidget } from "./hooks/camera/use-flies-to-widget.js";
import { useLayerFit } from "./hooks/camera/use-layer-fit.js";
import { PRESSABLE_CONTROLS, usePanZoom } from "./hooks/camera/use-pan-zoom.js";
import { useGpuStage } from "./hooks/frames/use-gpu-stage.js";
import { usePastedPhotos } from "./hooks/photos/use-pasted-photos.js";
import { useCanvasSelection } from "./hooks/selection/use-canvas-selection.js";
import { useEscapeClears } from "./hooks/selection/use-escape-clears.js";
import { usePickResolved } from "./hooks/selection/use-pick-resolved.js";
import { Highlight } from "./highlight.js";
import { regionsOfPage } from "./page-regions.js";
import { widgetOpenerOf } from "./regions/references-region.js";
import { FLOATING, ZoomBar } from "./zoom-bar.js";

export interface CanvasFieldActs {
	readonly getMode: CanvasMode;
	readonly getRenderer: PageRenderer;
	readonly getCamera: Camera | null;
	readonly getSelection: Selection | null;
	readonly getFocusedWidget: string | null;
	readonly moveCamera: Act<{ readonly camera: Camera | null }>;
	readonly select: Act<{ readonly selection: Selection | null }>;
	readonly focusWidget: Act<{ readonly widget: string | null }>;
	readonly addPhotos: Act<{ readonly photos: File[] }>;
	readonly pickVariant: Act<{ readonly page: string; readonly screen: string }>;
}

export interface CanvasFieldProps {
	readonly acts: CanvasFieldActs;
	readonly design: ReadDesign;
	readonly drawing: DrawingKit;
	readonly pages: CanvasPages;
	readonly docs: readonly CanvasDoc[];
	readonly viewport: FrameSize;
}

const HINT = "Answer a job on its page, or tell the agent in the chat";
const PRESSABLE_IN_DESIGN = `${PRESSABLE_CONTROLS}, [data-wg-job]`;
const FIELD =
	"cv:relative cv:h-full cv:touch-none cv:overflow-hidden cv:bg-group cv:bg-[radial-gradient(var(--wg-kit-group-line)_1px,transparent_1px)] cv:bg-[length:20px_20px]";
const LAYER =
	"cv:absolute cv:top-0 cv:left-0 cv:flex cv:w-max cv:origin-top-left cv:flex-col cv:items-start cv:gap-[120px] cv:p-20 cv:motion-safe:animate-canvas-fade-in";

export function CanvasField({ acts, design, drawing, pages, docs, viewport }: CanvasFieldProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const { getMode: mode, getSelection: picked } = acts;
	const { refusal, heard } = useRefusal();
	const isPointer = mode === "pointer";
	const grips = { isHand: mode === "hand", pressable: PRESSABLE_IN_DESIGN, ownScroll: null };
	const kept = { camera: acts.getCamera, onKept: (camera: Camera) => heard(acts.moveCamera({ camera })) };
	const pan = usePanZoom(layerRef, useLayerFit(layerRef, viewport), grips, kept);
	const onPick = useCallback((selection: Selection | null) => heard(acts.select({ selection })), [acts, heard]);
	const picking = { picked, onPick };
	const selection = useCanvasSelection(layerRef, pan, picking);
	usePickResolved(layerRef, pan, picking);
	const clear = useCallback(() => onPick(null), [onPick]);
	useEscapeClears(picked !== null, clear);
	const flown = useCallback(() => heard(acts.focusWidget({ widget: null })), [acts, heard]);
	useFliesToWidget({ layerRef, pan, widget: acts.getFocusedWidget, onDone: flown });
	const addPhotos = useCallback(
		(photos: readonly File[]) => heard(acts.addPhotos({ photos: [...photos] })),
		[acts, heard],
	);
	usePastedPhotos(drawing.ownsPaste, addPhotos);
	const { registry, host } = drawing;
	const regions = useMemo(() => {
		const opener = widgetOpenerOf(registry, (widget) => heard(acts.focusWidget({ widget })));
		const onVariant = (page: string, screen: string): void => heard(acts.pickVariant({ page, screen }));
		return regionsOfPage({ design, pages, docs, opener, onVariant, registry, host });
	}, [design, pages, docs, registry, host, acts, heard]);
	const gpu = useGpuStage(acts.getRenderer === "gpu" ? drawing.gpu : null, layerRef, pan);
	return (
		<GPU_FRAMES.Provider value={gpu.frames}>
			<div
				className={`${FIELD} ${isPointer ? "cv:cursor-default" : "cv:cursor-grab"}`}
				ref={pan.fieldRef}
				{...pan.moves}
				{...(isPointer ? selection.pointing : {})}
				onDragOver={(event: DragEvent) => event.preventDefault()}
				onDrop={(event: DragEvent) => {
					const photos = imageFilesIn(event.dataTransfer?.files);
					if (photos.length === 0) return;
					event.preventDefault();
					addPhotos(photos);
				}}
				data-canvas-field=""
			>
				<div className={LAYER} ref={layerRef} data-canvas-layer="">
					{regions}
					<Highlight spot={isPointer ? selection.hovered : null} tone="hover" />
					<Highlight spot={picked?.spot ?? null} tone="picked" />
				</div>
				{gpu.frames ? (
					<canvas
						ref={gpu.setCanvas}
						className="cv:pointer-events-none cv:absolute cv:inset-0 cv:block cv:h-full cv:w-full"
						data-canvas-gpu=""
					/>
				) : null}
				<ZoomBar pan={pan} />
				<SaidLine said={refusal} className={`${FLOATING} cv:right-4 cv:bottom-16`} />
				<div className={`${FLOATING} cv:right-4 cv:bottom-4 cv:gap-2 cv:text-muted-foreground`} data-canvas-chrome="">
					{HINT}
				</div>
			</div>
		</GPU_FRAMES.Provider>
	);
}
