import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { usePanZoom } from "@widgetarium/behaviors";
import { FieldStateQuery } from "@widgetarium/canvas";
import { CameraQuery } from "@widgetarium/canvas";
import { KeepCameraCommand } from "@widgetarium/canvas";
import { FieldRegions } from "./field-regions.js";
import { PRESSABLE } from "../../lib/field-marks.js";
import { Highlight } from "./highlight.js";
import { useFieldPointing } from "../../lib/use-field-pointing.js";
import { useGpuStage } from "../../lib/use-gpu-stage.js";
import { useCanvasSurroundings } from "../../lib/canvas-surroundings.js";
import { FrameRateLabel } from "./frame-rate-label.js";
import { useGridFollowsCamera } from "../../lib/use-grid-follows-camera.js";

const FIELD =
	"cv:relative cv:h-full cv:touch-none cv:overflow-hidden cv:bg-board cv:bg-[radial-gradient(var(--border)_var(--canvas-grid-dot,1px),transparent_var(--canvas-grid-dot,1px))] cv:bg-[length:var(--canvas-grid-pitch,18px)_var(--canvas-grid-pitch,18px)] cv:bg-[position:var(--canvas-grid-x,0px)_var(--canvas-grid-y,0px)]";
const LAYER =
	"cv:absolute cv:top-0 cv:left-0 cv:flex cv:w-max cv:origin-top-left cv:flex-col cv:items-start cv:gap-[120px] cv:p-20 cv:motion-safe:animate-canvas-fade-in";

export function FieldStage(): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const state = useQuery(FieldStateQuery).data;
	const { camera } = useQuery(CameraQuery).data;
	const keepCamera = useCommand(KeepCameraCommand);
	const grips = { isHand: !state.isPointer, pressable: PRESSABLE, ownScroll: null };
	const pan = usePanZoom({ layerRef, fieldRef }, grips, {
		camera,
		onKept: (kept) => void keepCamera.run({ camera: kept }),
	});
	useGridFollowsCamera(pan, pan.fieldRef);
	const pointed = useFieldPointing(layerRef, pan, state);
	const gpu = useGpuStage(useCanvasSurroundings().gpu, layerRef, pan);
	return (
		<GPU_FRAMES.Provider value={gpu.frames}>
			<div
				className={`${FIELD} ${state.isPointer ? "cv:cursor-default" : "cv:cursor-grab"}`}
				ref={pan.fieldRef}
				{...pan.moves}
				{...(state.isPointer ? pointed.handlers : {})}
				data-canvas-field=""
			>
				<div className={LAYER} ref={layerRef} data-canvas-layer="">
					<FieldRegions />
					<Highlight spot={pointed.hovered} tone="hover" />
					<Highlight spot={state.pickedSpot} tone="picked" />
				</div>
				{gpu.frames ? (
					<canvas
						ref={gpu.setCanvas}
						className="cv:pointer-events-none cv:absolute cv:inset-0 cv:block cv:h-full cv:w-full"
						data-canvas-gpu=""
					/>
				) : null}
				{gpu.frames ? <FrameRateLabel frameRate={gpu.frames.frameRate} /> : null}
			</div>
		</GPU_FRAMES.Provider>
	);
}
