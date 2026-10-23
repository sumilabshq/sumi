import { FRAME_BOUNDS, USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { FrameSidesStore } from "../../shared/lib/frame-sides-store.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import { PaneTreeStore } from "../../shared/lib/pane-tree-store.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import type { FrameSide, SideLook } from "../../shared/schema/frame-sides.schema.js";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";
import type { FrameSidesGateway } from "../frame-sides/frame-sides.gateway.js";
import { FlagMemoryFrameSidesGateway } from "../frame-sides/flag-memory.gateway.js";
import type { SideMemories } from "../frame-sides/flag-memory.gateway.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";

export interface ShellParts {
	readonly frameSidesGateway: FrameSidesGateway;
	readonly frameSidesStore: FrameSidesStore;
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

export function shellPartsOf(widthMemories: FrameMemories, sideMemories: SideMemories): ShellParts {
	const frameWidthsGateway = new PxMemoryFrameWidthsGateway(widthMemories);
	const frameSidesGateway = new FlagMemoryFrameSidesGateway(sideMemories);
	const keptLook = (side: FrameSide): SideLook => (frameSidesGateway.readHidden(side) === true ? "hidden" : "docked");
	const keptOr = (edge: FrameEdge): number =>
		Math.max(FRAME_BOUNDS[edge].leastPx, frameWidthsGateway.read(edge) ?? USUAL_WIDTHS[edge]);
	return {
		frameSidesGateway,
		frameSidesStore: new FrameSidesStore({
			left: keptLook("left"),
			right: keptLook("right"),
		}),
		frameWidthsGateway,
		frameWidthsStore: new FrameWidthsStore({
			left: keptOr("left"),
			chat: keptOr("chat"),
		}),
		paneTreeStore: new PaneTreeStore(FIRST_PANES),
	};
}
