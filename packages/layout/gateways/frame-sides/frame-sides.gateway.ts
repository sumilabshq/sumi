import type { FrameSides } from "../../shared/schema/frame-sides.schema.js";

export abstract class FrameSidesGateway {
	abstract sides(): FrameSides;
	abstract saveSides(sides: FrameSides, reason: string): void;
	abstract sidesChanged(listener: () => void): () => void;
}
