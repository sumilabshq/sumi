import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface TileMapCell {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface TileMapProps {
	readonly cells: readonly TileMapCell[];
	readonly markedId: string | null;
	readonly label?: string | undefined;
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
const LEAST_CELL_PX = 2;

export function TileMap({ cells, markedId, label }: TileMapProps): ReactElement {
	return (
		<svg
			className="wg-kit-tile-map"
			width={WIDTH_PX}
			height={HEIGHT_PX}
			viewBox={`0 0 ${WIDTH_PX} ${HEIGHT_PX}`}
			role={label === undefined ? undefined : "img"}
			aria-label={label}
			aria-hidden={label === undefined ? true : undefined}
			shapeRendering="crispEdges"
		>
			{cells.map((cell) => {
				const pixel = pixelCellOf(cell);
				return (
					<rect
						key={cell.id}
						x={pixel.x}
						y={pixel.y}
						width={pixel.w}
						height={pixel.h}
						data-marked={cell.id === markedId ? "" : undefined}
					/>
				);
			})}
		</svg>
	);
}

function pixelCellOf(cell: TileMapCell): PixelCell {
	const x = Math.round(cell.x * (WIDTH_PX + GAP_PX));
	const y = Math.round(cell.y * (HEIGHT_PX + GAP_PX));
	return {
		x,
		y,
		w: Math.max(LEAST_CELL_PX, Math.round((cell.x + cell.w) * (WIDTH_PX + GAP_PX)) - x - GAP_PX),
		h: Math.max(LEAST_CELL_PX, Math.round((cell.y + cell.h) * (HEIGHT_PX + GAP_PX)) - y - GAP_PX),
	};
}
