import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasRow } from "@sumi/artboards/contract";

type SketchBox = CanvasRow["sketch"][number];

const PAD_SHARE = 0.08;

export function CardSketch({ boxes }: { readonly boxes: readonly SketchBox[] }): ReactElement {
	if (boxes.length === 0) {
		return <span className="sumi-canvas-card-sketch" aria-hidden="true" />;
	}

	const left = Math.min(...boxes.map(({ x }) => x));
	const top = Math.min(...boxes.map(({ y }) => y));
	const width = Math.max(...boxes.map(({ x, w }) => x + w)) - left;
	const height = Math.max(...boxes.map(({ y, h: tall }) => y + tall)) - top;
	const pad = Math.max(width, height) * PAD_SHARE;
	return (
		<span className="sumi-canvas-card-sketch" aria-hidden="true">
			<svg
				viewBox={`${left - pad} ${top - pad} ${width + 2 * pad} ${height + 2 * pad}`}
				preserveAspectRatio="xMidYMid meet"
			>
				{boxes.map((box, at) => (
					<rect
						key={at}
						className="sumi-canvas-card-box"
						x={box.x}
						y={box.y}
						width={box.w}
						height={box.h}
					/>
				))}
			</svg>
		</span>
	);
}
