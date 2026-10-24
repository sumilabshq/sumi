import type { JsonMemory } from "@widgetarium/behaviors";
import { FRAME_BOUNDS, USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { FrameSidesStore } from "../../shared/lib/frame-sides-store.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import { PaneTreeStore } from "../../shared/lib/pane-tree-store.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import { FrameSideSchema } from "../../shared/schema/frame-sides.schema.js";
import type { FrameSide, FrameSides, SideLook } from "../../shared/schema/frame-sides.schema.js";
import { FrameEdgeSchema } from "../../shared/schema/frame-widths.schema.js";
import type { FrameEdge, FrameWidths } from "../../shared/schema/frame-widths.schema.js";
import type { FrameSidesGateway } from "../frame-sides/frame-sides.gateway.js";
import { FlagMemoryFrameSidesGateway } from "../frame-sides/flag-memory.gateway.js";
import type { SideMemories } from "../frame-sides/flag-memory.gateway.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";
import { JsonMemoryPaneTreeGateway } from "../pane-tree/json-memory.gateway.js";

export interface LayoutParts {
	readonly frameSidesStore: FrameSidesStore;
	readonly frameWidthsStore: FrameWidthsStore;
	readonly paneTreeStore: PaneTreeStore;
}

export interface LayoutMemories {
	readonly widths: FrameMemories;
	readonly sides: SideMemories;
	readonly panes: JsonMemory<PaneTree>;
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

export function layoutPartsOf({ widths, sides, panes }: LayoutMemories): LayoutParts {
	const paneTreeGateway = new JsonMemoryPaneTreeGateway(panes);
	return {
		frameSidesStore: frameSidesStoreOf(new FlagMemoryFrameSidesGateway(sides)),
		frameWidthsStore: frameWidthsStoreOf(new PxMemoryFrameWidthsGateway(widths)),
		paneTreeStore: new PaneTreeStore(paneTreeGateway.read() ?? FIRST_PANES, (tree, reason) =>
			paneTreeGateway.keep(tree, reason),
		),
	};
}

function frameSidesStoreOf(gateway: FrameSidesGateway): FrameSidesStore {
	const keptLook = (side: FrameSide): SideLook => (isKeptHidden(gateway, side) ? "hidden" : "docked");
	return new FrameSidesStore(
		{
			left: keptLook("left"),
			right: keptLook("right"),
		},
		(next) => keepSidesHidden(gateway, next),
	);
}

function frameWidthsStoreOf(gateway: FrameWidthsGateway): FrameWidthsStore {
	return new FrameWidthsStore(
		{
			left: keptWidthOf(gateway, "left"),
			chat: keptWidthOf(gateway, "chat"),
		},
		(next) => keepWidths(gateway, next),
	);
}

function isKeptHidden(gateway: FrameSidesGateway, side: FrameSide): boolean {
	return gateway.readHidden(side) === true;
}

function keptWidthOf(gateway: FrameWidthsGateway, edge: FrameEdge): number {
	return Math.max(FRAME_BOUNDS[edge].leastPx, gateway.read(edge) ?? USUAL_WIDTHS[edge]);
}

function keepSidesHidden(gateway: FrameSidesGateway, sides: FrameSides): void {
	for (const side of FrameSideSchema.options) {
		const isHidden = sides[side] !== "docked";

		if (isKeptHidden(gateway, side) !== isHidden) {
			gateway.rememberHidden(side, isHidden);
		}
	}
}

function keepWidths(gateway: FrameWidthsGateway, widths: FrameWidths): void {
	for (const edge of FrameEdgeSchema.options) {
		if (keptWidthOf(gateway, edge) !== widths[edge]) {
			gateway.keep(edge, widths[edge]);
		}
	}
}
