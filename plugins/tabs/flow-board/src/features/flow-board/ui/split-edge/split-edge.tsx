import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SplitEdge as Edge } from "@sumi/flow-strip-plugin";
import { edgePlaceOf } from "../../lib/edge-shares.js";

export interface SplitEdgeProps {
	readonly edge: Edge;
	readonly onBegin: (edge: Edge) => void;
}

export function SplitEdge({ edge, onBegin }: SplitEdgeProps): ReactElement {
	return (
		<div
			className="sumi-flow-edge"
			role="separator"
			aria-orientation={edge.dir === "row" ? "vertical" : "horizontal"}
			data-dir={edge.dir}
			style={edgePlaceOf(edge)}
			onPointerDown={(event) => {
				event.preventDefault();
				onBegin(edge);
			}}
		/>
	);
}
