import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";

export abstract class FrameWidthsGateway {
	abstract read(edge: FrameEdge): number | null;
	abstract keep(edge: FrameEdge, px: number): void;
}
