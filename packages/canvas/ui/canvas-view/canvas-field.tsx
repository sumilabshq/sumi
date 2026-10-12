import { createElement as h, useCallback, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import type { InjectProps } from "@widgetarium/core";
import type { Camera } from "../../schemas/camera.schema.js";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import type { canvasFieldInject } from "../../widgets/canvas-field.widget.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import { useFliesToWidget } from "./hooks/camera/use-flies-to-widget.js";
import { useLayerFit } from "./hooks/camera/use-layer-fit.js";
import { PRESSABLE_CONTROLS, usePanZoom } from "./hooks/camera/use-pan-zoom.js";
import { useGpuStage } from "./hooks/frames/use-gpu-stage.js";
import { useCanvasSelection } from "./hooks/selection/use-canvas-selection.js";
import { useEscapeClears } from "./hooks/selection/use-escape-clears.js";
import { usePickResolved } from "./hooks/selection/use-pick-resolved.js";
import { Highlight } from "./highlight.js";
import { regionsOfPage } from "./page-regions.js";
import { widgetOpenerOf } from "./regions/references-region.js";
import { FLOATING, ZoomBar } from "./zoom-bar.js";

export interface CanvasFieldProps {
	readonly acts: InjectProps<typeof canvasFieldInject>;
	readonly design: ReadDesign;
	readonly drawing: DrawingKit;
	readonly pages: CanvasPages;
	readonly docs: readonly CanvasDoc[];
}

const HINT = "Answer a job on its page, or tell the agent in the chat";
const PRESSABLE_IN_DESIGN = `${PRESSABLE_CONTROLS}, [data-wg-job]`;
const FIELD =
	"cv:relative cv:h-full cv:touch-none cv:overflow-hidden cv:bg-group cv:bg-[radial-gradient(var(--wg-kit-group-line)_1px,transparent_1px)] cv:bg-[length:20px_20px]";
const LAYER =
	"cv:absolute cv:top-0 cv:left-0 cv:flex cv:w-max cv:origin-top-left cv:flex-col cv:items-start cv:gap-[120px] cv:p-20 cv:motion-safe:animate-canvas-fade-in";

export function CanvasField({ acts, design, drawing, pages, docs }: CanvasFieldProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const { getMode: mode, getSelection: picked } = acts;
	const { refusal, heard } = useRefusal();
	const isPointer = mode === "pointer";
	const grips = { isHand: mode === "hand", pressable: PRESSABLE_IN_DESIGN, ownScroll: null };
	const kept = { camera: acts.getCamera, onKept: (camera: Camera) => heard(acts.moveCamera({ camera })) };
	const pan = usePanZoom({ layerRef, fieldRef }, useLayerFit(layerRef, fieldRef), grips, kept);
	const onPick = useCallback((selection: Selection | null) => heard(acts.select({ selection })), [acts, heard]);
	const picking = { picked, onPick };
	const selection = useCanvasSelection(layerRef, pan, picking);
	usePickResolved(layerRef, pan, picking);
	const clear = useCallback(() => onPick(null), [onPick]);
	useEscapeClears(picked !== null, clear);
	const flown = useCallback(() => heard(acts.focusWidget({ widget: null })), [acts, heard]);
	useFliesToWidget({ layerRef, pan, widget: acts.getFocusedWidget, onDone: flown });
	const regions = useMemo(() => {
		const opener = widgetOpenerOf(drawing.registry, (widget) => heard(acts.focusWidget({ widget })));
		return regionsOfPage({ design, pages, docs, opener, registry: drawing.registry, host: drawing.host });
	}, [design, pages, docs, drawing, acts, heard]);
	const gpu = useGpuStage(acts.getRenderer === "gpu" ? drawing.gpu : null, layerRef, pan);
	return (
		<GPU_FRAMES.Provider value={gpu.frames}>
			<div
				className={`${FIELD} ${isPointer ? "cv:cursor-default" : "cv:cursor-grab"}`}
				ref={pan.fieldRef}
				{...pan.moves}
				{...(isPointer ? selection.pointing : {})}
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
