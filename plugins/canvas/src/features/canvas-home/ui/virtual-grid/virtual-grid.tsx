import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { COLUMN_GAP_PX, gridHeightOf, gridShapeOf, shownSpanOf, wantedSpanOf } from "../../lib/grid-span.js";
import type { IndexSpan } from "../../lib/grid-span.js";
import { useGridView } from "../../lib/use-grid-view.js";

export interface VirtualGridProps<T> {
	readonly scroller: HTMLElement | null;
	readonly total: number;
	readonly cardPx: number;
	readonly itemAt: (index: number) => T | undefined;
	readonly drawItem: (item: T | undefined) => ReactNode;
	readonly onWanted: (span: IndexSpan) => void;
}

export function VirtualGrid<T>({ scroller, total, cardPx, itemAt, drawItem, onWanted }: VirtualGridProps<T>): ReactElement {
	const grid = useRef<HTMLDivElement>(null);
	const view = useGridView(scroller, grid);
	const shape = gridShapeOf(view.width, cardPx);
	const shown = shownSpanOf(view, shape, total);
	const { first, last } = wantedSpanOf(shown, view, shape);

	useEffect(() => {
		onWanted({
			first,
			last,
		});
	}, [onWanted, first, last]);

	const indexes = Array.from({ length: shown.last - shown.first }, (_, at) => shown.first + at);
	return (
		<div ref={grid} className="sumi-canvas-grid" style={{ height: gridHeightOf(total, shape) }}>
			{indexes.map((index) => (
				<div
					key={index}
					className="sumi-canvas-grid-cell"
					style={{
						top: Math.floor(index / shape.columns) * shape.rowPx,
						left: (index % shape.columns) * (shape.cardWidth + COLUMN_GAP_PX),
						width: shape.cardWidth,
						height: shape.cardPx,
					}}
				>
					{drawItem(itemAt(index))}
				</div>
			))}
		</div>
	);
}
