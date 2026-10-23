import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { FRAME_BOUNDS } from "../../../../shared/lib/frame-bounds.js";
import type { FrameEdge } from "../../../../shared/schema/frame-widths.schema.js";
import { useFrameEdge } from "../../lib/use-frame-edge.js";

export interface FrameEdgeHandleProps {
	readonly edge: FrameEdge;
	readonly px: number;
}

const EDGE_LABEL: Readonly<Record<FrameEdge, string>> = {
	left: "Chats width",
	chat: "Chat width",
};

export const FrameEdgeHandle = memo(function FrameEdgeHandle({ edge, px }: FrameEdgeHandleProps): ReactElement {
	const handlers = useFrameEdge(edge, px);
	return (
		<div
			role="separator"
			tabIndex={0}
			aria-label={EDGE_LABEL[edge]}
			aria-orientation="vertical"
			aria-valuenow={px}
			aria-valuemin={FRAME_BOUNDS[edge].leastPx}
			className="wg-shell-edge"
			data-shell-edge={edge}
			{...handlers}
		/>
	);
});
