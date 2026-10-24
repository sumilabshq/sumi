import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import type { FrameEdge } from "@widgetarium/layout";
import { useFrameEdge } from "../../lib/use-frame-edge.js";

export interface FrameEdgeHandleProps {
	readonly edge: FrameEdge;
	readonly px: number;
	readonly leastPx: number;
	readonly plateLeastPx: number;
	readonly isReachable: boolean;
}

const EDGE_LABEL: Readonly<Record<FrameEdge, string>> = {
	left: "Chats width",
	chat: "Chat width",
};

export const FrameEdgeHandle = memo(function FrameEdgeHandle({
	edge,
	px,
	leastPx,
	plateLeastPx,
	isReachable,
}: FrameEdgeHandleProps): ReactElement {
	const handlers = useFrameEdge({ edge, px, plateLeastPx });
	return (
		<div
			role="separator"
			tabIndex={isReachable ? 0 : -1}
			aria-hidden={isReachable ? undefined : true}
			aria-label={EDGE_LABEL[edge]}
			aria-orientation="vertical"
			aria-valuenow={px}
			aria-valuemin={leastPx}
			className="wg-shell-edge"
			data-shell-edge={edge}
			{...handlers}
		/>
	);
});
