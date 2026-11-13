import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { usePanZoom } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { ArtboardFrame } from "../artboard-frame/artboard-frame.js";
import { CanvasGlow } from "../canvas-glow/canvas-glow.js";

const GRIPS = {
	isHand: true,
	pressable: "[data-artboard-name]",
	ownScroll: null,
};
const EMPTY = "Ask Sumi to draw on this canvas";
const ZOOM_VAR = "--sumi-canvas-zoom";
const FIELD_MARGIN_PX = 240;

export function ArtboardField(): ReactElement {
	const { tabId, pickBoard, zoom } = useCanvasView();
	const canvas = useQuery(artboards.canvases.getCanvas, { tabId }).data;
	const boards = useQuery(artboards.boards.getShownPageBoards, { tabId }).data;
	const keep = useCommand(artboards.view.keepCamera);
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const pan = usePanZoom({ layerRef, fieldRef }, GRIPS, {
		camera: canvas.camera,
		onKept: (camera) => void keep.run({ tabId, camera }),
	});
	useEffect(() => {
		const show = (scale: number): void => {
			fieldRef.current?.style.setProperty(ZOOM_VAR, `${scale}`);
			zoom.show(Math.round(scale * 100) / 100);
		};
		show(pan.lookNow().scale);
		return pan.watchLook((look) => show(look.scale));
	}, [pan.watchLook, pan.lookNow, zoom]);
	const width = Math.max(0, ...boards.map(({ x, w }) => x + w));
	const height = Math.max(0, ...boards.map(({ y, h: tall }) => y + tall));
	return (
		<div
			className="sumi-canvas-field"
			ref={pan.fieldRef}
			{...pan.moves}
			onPointerDown={(event) => {
				if (event.target instanceof Element && event.target.closest("[data-artboard]") === null) {
					pickBoard(null);
				}

				pan.moves.onPointerDown(event);
			}}
		>
			<div
				className="sumi-canvas-layer"
				ref={layerRef}
				style={{ width: width + 2 * FIELD_MARGIN_PX, height: height + 2 * FIELD_MARGIN_PX }}
			>
				<div className="sumi-canvas-origin" style={{ left: FIELD_MARGIN_PX, top: FIELD_MARGIN_PX }}>
					<CanvasGlow boards={boards} />
					{boards.map((board) => (
						<ArtboardFrame key={board.id} board={board} scaleNow={() => pan.lookNow().scale} />
					))}
				</div>
			</div>
			{boards.length === 0 ? <p className="sumi-canvas-empty">{EMPTY}</p> : null}
		</div>
	);
}
