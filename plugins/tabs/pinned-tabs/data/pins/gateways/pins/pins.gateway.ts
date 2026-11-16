import type { PinsMove } from "../../shared/lib/pin-edits.js";
import type { Pin } from "../../shared/schema/pins.schema.js";

export type MovePins = (pins: readonly Pin[]) => PinsMove | null;

export abstract class PinsGateway {
	abstract pins(): Promise<readonly Pin[]>;
	abstract movePins(move: MovePins): Promise<PinsMove | null>;
	abstract pinsChanged(listener: () => void): () => void;
}
