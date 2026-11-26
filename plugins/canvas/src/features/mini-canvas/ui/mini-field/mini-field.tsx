import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactElement } from "react";
import { cardLookOf } from "@sumi/canvas-work/card-look";
import type { CardBox, CardLook, CardSize } from "@sumi/canvas-work/card-look";
import { usePanZoom } from "@widgetarium/behaviors";
import { useLiveBoards } from "../../../canvas/lib/use-live-boards.js";

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
	readonly aim: CardBox | null;
}

const GRIPS = {
	isHand: true,
	pressable: "[data-mini-canvas-head]",
	ownScroll: null,
};
const ZOOM_VAR = "--canvas-zoom";
const FIELD_MARGIN_PX = 80;
const NO_BOX: CardBox = { x: 0, y: 0, width: 0, height: 0 };
const KEEPS_NOTHING = (): void => undefined;

export function MiniField({ boards, background, aim }: MiniFieldProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const camera = useAimedCamera(aim, useMeasuredSize(fieldRef));
	const pan = usePanZoom({ layerRef, fieldRef }, GRIPS, { camera, onKept: KEEPS_NOTHING });
	const live = useLiveBoards(boards, pan, FIELD_MARGIN_PX);
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
							{live.liveIds.has(board.id) ? (
								<iframe
									className="sumi-canvas-board-page"
									title={board.name}
									sandbox="allow-scripts"
									srcDoc={board.html}
									onLoad={() => live.onBoardLoaded(board.id)}
								/>
							) : null}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function useMeasuredSize(fieldRef: MutableRefObject<HTMLDivElement | null>): CardSize | null {
	const [size, setSize] = useState<CardSize | null>(null);
	useEffect(() => {
		const field = fieldRef.current;

		if (field === null) {
			return undefined;
		}

		const measure = (): void =>
			setSize((was) =>
				was?.width === field.clientWidth && was.height === field.clientHeight
					? was
					: { width: field.clientWidth, height: field.clientHeight },
			);
		measure();
		const watching = new ResizeObserver(measure);
		watching.observe(field);
		return () => watching.disconnect();
	}, [fieldRef]);
	return size;
}

function useAimedCamera(aim: CardBox | null, size: CardSize | null): CardLook | null {
	const { x, y, width, height } = aim ?? NO_BOX;
	const cardWidth = size?.width ?? 0;
	const cardHeight = size?.height ?? 0;
	const isAimed = aim !== null && cardWidth > 0 && cardHeight > 0;
	return useMemo(
		() =>
			isAimed
				? cardLookOf({ x: x + FIELD_MARGIN_PX, y: y + FIELD_MARGIN_PX, width, height }, { width: cardWidth, height: cardHeight })
				: null,
		[isAimed, x, y, width, height, cardWidth, cardHeight],
	);
}
