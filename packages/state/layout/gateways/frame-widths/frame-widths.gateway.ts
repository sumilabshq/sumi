import type { FrameWidths } from "../../shared/schema/frame-widths.schema.js";

export abstract class FrameWidthsGateway {
	abstract widths(): FrameWidths;
	abstract saveWidths(widths: FrameWidths, reason: string): void;
	abstract widthsChanged(listener: () => void): () => void;
}
