import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { usePanZoom } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { useLiveBoards } from "../../lib/use-live-boards.js";
import { ArtboardFrame } from "../artboard-frame/artboard-frame.js";
import { FieldMenu } from "../field-menu/field-menu.js";
import type { MenuSpot } from "../field-menu/field-menu.js";

const GRIPS = {
	isHand: true,
	pressable: "[data-artboard-name]",
	ownScroll: null,
};
const ZOOM_VAR = "--canvas-zoom";
const FIELD_MARGIN_PX = 240;

export function ArtboardField(): ReactElement {
	const { canvasId, pickBoard, zoom } = useCanvasView();
	const canvas = useQuery(artboards.canvases.getCanvas, { canvasId }).data;
	const boards = useQuery(artboards.boards.getShownPageBoards, { canvasId }).data;
	const keep = useCommand(artboards.view.keepCamera);
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const [menuSpot, setMenuSpot] = useState<MenuSpot | null>(null);
	const pan = usePanZoom({ layerRef, fieldRef }, GRIPS, {
		camera: canvas.camera,
		onKept: (camera) => void keep.run({ canvasId, camera }),
	});
	const live = useLiveBoards(boards, pan, FIELD_MARGIN_PX);
	useEffect(() => {
		const show = (scale: number): void => {
			fieldRef.current?.style.setProperty(ZOOM_VAR, `${scale}`);
			zoom.show(Math.round(scale * 100) / 100);
		};
		show(pan.lookNow().scale);
		return pan.watchLook((look) => show(look.scale));
	}, [pan.watchLook, pan.lookNow, zoom]);
	useEffect(
		() =>
			zoom.steerWith({
				fitNow: pan.fitNow,
				lookNow: pan.lookNow,
				flyTo: pan.flyTo,
				fieldOf: () => fieldRef.current,
			}),
		[zoom, pan.fitNow, pan.lookNow, pan.flyTo],
	);
	const width = Math.max(0, ...boards.map(({ x, w }) => x + w));
	const height = Math.max(0, ...boards.map(({ y, h: tall }) => y + tall));
	return (
		<div
			className="sumi-canvas-field"
			style={canvas.background === null ? undefined : { background: canvas.background }}
			ref={pan.fieldRef}
			onContextMenu={(event) => {
				event.preventDefault();

				if (event.target instanceof Element && event.target.closest("[data-artboard]") === null) {
					setMenuSpot({
						x: event.clientX,
						y: event.clientY,
					});
				}
			}}
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
					{boards.map((board) => (
						<ArtboardFrame
							key={board.id}
							board={board}
							scaleNow={() => pan.lookNow().scale}
							isLive={live.liveIds.has(board.id)}
							onLoaded={live.onBoardLoaded}
						/>
					))}
				</div>
			</div>
			<FieldMenu spot={menuSpot} onClose={() => setMenuSpot(null)} />
		</div>
	);
}
