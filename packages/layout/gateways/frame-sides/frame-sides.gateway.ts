import type { FrameSide } from "../../shared/schema/frame-sides.schema.js";

export abstract class FrameSidesGateway {
	abstract readHidden(side: FrameSide): boolean | null;
	abstract rememberHidden(side: FrameSide, isHidden: boolean): void;
}
