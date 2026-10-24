import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../../shared/schema/canvas-view.schema.js";

export type ReturnTo =
	| { readonly kind: "note"; readonly open: (note: string | null) => Promise<void> }
	| { readonly kind: "view"; readonly open: () => Promise<void> };

export type CanvasHostGiven = { readonly [K in keyof CanvasHost]: CanvasHost[K] };

const STAYS_PUT: ReturnTo = { kind: "view", open: async () => undefined };

export class CanvasHost {
	readonly opened: CanvasOpened;
	readonly gpu: GpuSupply | null;
	readonly returnTo: ReturnTo;
	readonly cameFrom: () => string;
	readonly ownsPaste: () => boolean;
	readonly keepOpening: (kept: CanvasOpening) => void;

	constructor(given: CanvasHostGiven) {
		this.opened = given.opened;
		this.gpu = given.gpu;
		this.returnTo = given.returnTo;
		this.cameFrom = given.cameFrom;
		this.ownsPaste = given.ownsPaste;
		this.keepOpening = given.keepOpening;
	}
}

export function detachedHostOf(opened: CanvasOpened): CanvasHost {
	return new CanvasHost({
		opened,
		gpu: null,
		returnTo: STAYS_PUT,
		cameFrom: cameFromNowhere,
		ownsPaste: takesNoPaste,
		keepOpening: keepsNothing,
	});
}

function cameFromNowhere(): string {
	return "";
}

function takesNoPaste(): boolean {
	return false;
}

function keepsNothing(): void {}
