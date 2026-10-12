import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import { useCommand, useQuery } from "@widgetarium/core/mediator";
import { usePanZoom } from "@widgetarium/behaviors";
import { FieldStateQuery } from "../../requests/field/field-state.js";
import { CameraQuery } from "../../requests/view/camera.js";
import { KeepCameraCommand } from "../../requests/view/keep-camera.js";
import { FieldRegions } from "./field-regions.js";
import { PRESSABLE } from "./field-marks.js";
import { Highlight } from "./highlight.js";
import { useFieldPointing } from "./use-field-pointing.js";
import { useGpuStage } from "./use-gpu-stage.js";
import { FLOATING, ZoomBar } from "./zoom-bar.js";

const HINT = "Answer a job on its page, or tell the agent in the chat";
const FIELD =
	"cv:relative cv:h-full cv:touch-none cv:overflow-hidden cv:bg-group cv:bg-[radial-gradient(var(--wg-kit-group-line)_1px,transparent_1px)] cv:bg-[length:20px_20px]";
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
	const pointed = useFieldPointing(layerRef, pan, state);
	const gpu = useGpuStage(state.gpu, layerRef, pan);
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
				<ZoomBar pan={pan} />
				<div className={`${FLOATING} cv:right-4 cv:bottom-4 cv:gap-2 cv:text-muted-foreground`} data-canvas-chrome="">
					{HINT}
				</div>
			</div>
		</GPU_FRAMES.Provider>
	);
}
