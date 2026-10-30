import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ResizeSplitCommand } from "@widgetarium/app-host";
import type { FrameBounds } from "@widgetarium/layout";
import type { PaneEdge } from "../../lib/pane-layout.js";
import { ResizePaneSplitCommand } from "@widgetarium/layout";
import { useEdgeDrag } from "../../lib/use-edge-drag.js";

export interface PaneSplitEdgeProps {
	readonly edge: PaneEdge;
	readonly bounds: FrameBounds;
	readonly onDrag: (edge: PaneEdge, share: number) => void;
	readonly onChatPx: (px: number, mostPx: number) => void;
}

const RESIZE_LABEL = "Resize panes";
const CHAT_EDGE = "chat";

export function PaneSplitEdge({ edge, bounds, onDrag, onChatPx }: PaneSplitEdgeProps): ReactElement {
	const resize = useCommand(ResizePaneSplitCommand);
	const resizeSplit = useCommand(ResizeSplitCommand);
	const { branchId } = edge;
	const least = bounds.plateLeastPx / edge.spanPx;
	const shareWithin = (asked: number): number => Math.min(Math.max(asked, least), edge.pairShare - least);
	const commit = (share: number): void => {
		void (branchId === null
			? resize.run({ splitId: edge.splitId, at: edge.at, share })
			: resizeSplit.run({ branchId, at: edge.at, share }));

		if (edge.isChatEdge) {
			onChatPx(share * edge.spanPx, (edge.pairShare - least) * edge.spanPx);
		}
	};
	const handlers = useEdgeDrag({ edge, gap: edge.gapPx, shareWithin, onDrag, onRelease: commit });
	const isRow = edge.dir === "row";
	return (
		<div
			className="wg-pane-edge"
			data-pane-edge={`${edge.splitId}:${edge.at}`}
			data-pane-edge-dir={edge.dir}
			data-shell-edge={edge.isChatEdge ? CHAT_EDGE : undefined}
			role="separator"
			aria-label={RESIZE_LABEL}
			aria-orientation={isRow ? "vertical" : "horizontal"}
			style={{
				left: edge.rect.left,
				top: edge.rect.top,
				width: isRow ? undefined : edge.rect.width,
				height: isRow ? edge.rect.height : undefined,
			}}
			{...handlers}
			onDoubleClick={() =>
				commit(shareWithin(edge.isChatEdge ? bounds.chat.usualPx / edge.spanPx : edge.pairShare / 2))
			}
		/>
	);
}
