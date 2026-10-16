import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";

export type ReturnTo =
	| { readonly kind: "note"; readonly open: (note: string | null) => Promise<void> }
	| { readonly kind: "view"; readonly open: () => Promise<void> };

export abstract class CanvasHost {
	abstract readonly opened: CanvasOpened;
	abstract readonly gpu: GpuSupply | null;
	abstract readonly returnTo: ReturnTo;
	abstract cameFrom(): string;
	abstract ownsPaste(): boolean;
	abstract keepOpening(kept: CanvasOpening): void;
}
