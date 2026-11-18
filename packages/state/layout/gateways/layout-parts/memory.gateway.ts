import { USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";
import type { LayoutParts } from "./layout-parts.gateway.js";

export interface LayoutMemories {
	readonly widths: FrameMemories;
}

export function layoutPartsOf({ widths }: LayoutMemories): LayoutParts {
	return {
		frameWidths: new PxMemoryFrameWidthsGateway(widths, USUAL_WIDTHS),
	};
}
