import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SplitMap } from "@widgetarium/app-host";

export interface SplitMapIconProps {
	readonly map: SplitMap;
	readonly label: string | null;
}

interface PixelCell {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const WIDTH_PX = 16;
const HEIGHT_PX = 11;
const GAP_PX = 1;
const LEAST_CELL_PX = 3;
const CELL = "cv:fill-(--sumi-line-strong) cv:data-[marked]:fill-(--sumi-text)";
const BOX = "cv:block cv:flex-none cv:overflow-visible";

export function SplitMapIcon({ map, label }: SplitMapIconProps): ReactElement {
	return (
		<svg
			className={BOX}
			width={WIDTH_PX}
			height={HEIGHT_PX}
			viewBox={`0 0 ${WIDTH_PX} ${HEIGHT_PX}`}
			role={label === null ? undefined : "img"}
			aria-label={label ?? undefined}
			aria-hidden={label === null ? true : undefined}
			data-split-map=""
		>
			{map.cells.map((cell) => {
				const pixel = pixelCellOf(cell);
				return (
					<rect
						key={cell.tabId}
						className={CELL}
						x={pixel.x}
						y={pixel.y}
						width={pixel.w}
						height={pixel.h}
						rx={1}
						data-split-cell={cell.tabId}
						data-marked={cell.tabId === map.markedId || undefined}
					/>
				);
			})}
		</svg>
	);
}

function pixelCellOf(cell: SplitMap["cells"][number]): PixelCell {
	const x = Math.round(cell.x * (WIDTH_PX + GAP_PX));
	const y = Math.round(cell.y * (HEIGHT_PX + GAP_PX));
	return {
		x,
		y,
		w: Math.max(LEAST_CELL_PX, Math.round((cell.x + cell.w) * (WIDTH_PX + GAP_PX)) - x - GAP_PX),
		h: Math.max(LEAST_CELL_PX, Math.round((cell.y + cell.h) * (HEIGHT_PX + GAP_PX)) - y - GAP_PX),
	};
}
