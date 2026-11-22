import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cloverCellsOf, cloverRowsOf } from "../../lib/clover-cells.js";

const CELL_INSET = 0.04;

export function CloverMark({ size }: { readonly size: number }): ReactElement {
	const rows = cloverRowsOf(size);
	return (
		<svg
			className="sumi-figure-art"
			viewBox={`0 0 ${rows.length} ${rows.length}`}
			style={{
				width: size,
				height: size,
			}}
			aria-hidden="true"
		>
			<g className="sumi-figure-body">
				{cloverCellsOf(rows).map((cell) => (
					<rect
						key={`${cell.x}-${cell.y}`}
						className="sumi-figure-cell"
						data-leaf={cell.leaf}
						x={cell.x + CELL_INSET}
						y={cell.y + CELL_INSET}
						width={1 - 2 * CELL_INSET}
						height={1 - 2 * CELL_INSET}
					/>
				))}
			</g>
		</svg>
	);
}
