import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { usePanZoom } from "@widgetarium/behaviors";

export interface MiniFieldBoard {
	readonly id: string;
	readonly name: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly html: string;
}

export interface MiniFieldProps {
	readonly boards: readonly MiniFieldBoard[];
	readonly background: string | null;
}

const GRIPS = {
	isHand: true,
	pressable: "[data-mini-canvas-head]",
	ownScroll: null,
};
const UNKEPT = {
	camera: null,
	onKept: (): void => undefined,
};
const ZOOM_VAR = "--sumi-canvas-zoom";
const FIELD_MARGIN_PX = 80;

export function MiniField({ boards, background }: MiniFieldProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const pan = usePanZoom({ layerRef, fieldRef }, GRIPS, UNKEPT);
	useEffect(() => {
		const show = (scale: number): void => {
			fieldRef.current?.style.setProperty(ZOOM_VAR, `${scale}`);
		};
		show(pan.lookNow().scale);
		return pan.watchLook((look) => show(look.scale));
	}, [pan.watchLook, pan.lookNow]);
	const width = Math.max(0, ...boards.map(({ x, w }) => x + w));
	const height = Math.max(0, ...boards.map(({ y, h: tall }) => y + tall));
	return (
		<div
			className="sumi-canvas-field sumi-mini-canvas-field"
			style={background === null ? undefined : { background }}
			ref={pan.fieldRef}
			{...pan.moves}
		>
			<div
				className="sumi-canvas-layer"
				ref={layerRef}
				style={{ width: width + 2 * FIELD_MARGIN_PX, height: height + 2 * FIELD_MARGIN_PX }}
			>
				<div className="sumi-canvas-origin" style={{ left: FIELD_MARGIN_PX, top: FIELD_MARGIN_PX }}>
					{boards.map((board) => (
						<div
							key={board.id}
							className="sumi-canvas-board"
							style={{ left: board.x, top: board.y, width: board.w, height: board.h }}
						>
							<p className="sumi-canvas-board-name">{board.name}</p>
							<iframe className="sumi-canvas-board-page" title={board.name} sandbox="allow-scripts" srcDoc={board.html} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
