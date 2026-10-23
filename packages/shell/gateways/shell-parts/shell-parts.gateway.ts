import { FRAME_BOUNDS, USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { PxMemoryFrameWidthsGateway } from "../frame-widths/px-memory.gateway.js";
import type { FrameMemories } from "../frame-widths/px-memory.gateway.js";

export interface ShellParts {
	readonly frameWidthsGateway: FrameWidthsGateway;
	readonly frameWidthsStore: FrameWidthsStore;
}

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
	};
}
