import { FRAME_BOUNDS, USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import { PaneTreeStore } from "../../shared/lib/pane-tree-store.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";

export interface ShellParts {
	readonly frameWidthsGateway: FrameWidthsGateway;
	readonly frameWidthsStore: FrameWidthsStore;
	readonly paneTreeStore: PaneTreeStore;
}

export const FIRST_PANES: PaneTree = {
	root: {
		kind: "split",
		id: "pane-root",
		dir: "row",
		shares: [0.5, 0.5],
		children: [
			{
				kind: "pane",
				id: "pane-chat",
				view: { kind: "chat" },
			},
			{
				kind: "pane",
				id: "pane-app",
				view: {
					kind: "app",
					tabId: null,
				},
			},
		],
	},
	minted: 0,
	targetId: null,
};

export function shellPartsOf(memories: FrameMemories): ShellParts {
	const frameWidthsGateway = new PxMemoryFrameWidthsGateway(memories);
	const keptOr = (edge: FrameEdge): number =>
		Math.max(FRAME_BOUNDS[edge].leastPx, frameWidthsGateway.read(edge) ?? USUAL_WIDTHS[edge]);
	return {
		frameWidthsGateway,
		frameWidthsStore: new FrameWidthsStore({
			left: keptOr("left"),
			chat: keptOr("chat"),
		}),
		paneTreeStore: new PaneTreeStore(FIRST_PANES),
	};
}
