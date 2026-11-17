import type { FrameSide } from "../../shared/schema/frame-sides.schema.js";

export abstract class SidePeeksGateway {
	abstract isPeeking(side: FrameSide): boolean;
	abstract setPeeking(side: FrameSide, isPeeking: boolean): void;
	abstract peeksChanged(listener: () => void): () => void;
}
