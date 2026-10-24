import type { JsonMemory } from "@widgetarium/behaviors";
import { USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import type { FrameSides } from "../../shared/schema/frame-sides.schema.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import type { FrameSidesGateway } from "../frame-sides/frame-sides.gateway.js";
import { FlagMemoryFrameSidesGateway } from "../frame-sides/flag-memory.gateway.js";
import type { SideMemories } from "../frame-sides/flag-memory.gateway.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";
import type { PaneTreeGateway } from "../pane-tree/pane-tree.gateway.js";
import { JsonMemoryPaneTreeGateway } from "../pane-tree/json-memory.gateway.js";

export interface LayoutParts {
	readonly frameSides: FrameSidesGateway;
	readonly frameWidths: FrameWidthsGateway;
	readonly paneTree: PaneTreeGateway;
}

export interface LayoutMemories {
	readonly widths: FrameMemories;
	readonly sides: SideMemories;
	readonly panes: JsonMemory<PaneTree>;
}

export const FIRST_SIDES: FrameSides = {
	left: "docked",
	right: "docked",
};

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
	return {
		frameSides: new FlagMemoryFrameSidesGateway(sides, FIRST_SIDES),
		frameWidths: new PxMemoryFrameWidthsGateway(widths, USUAL_WIDTHS),
		paneTree: new JsonMemoryPaneTreeGateway(panes, FIRST_PANES),
	};
}
