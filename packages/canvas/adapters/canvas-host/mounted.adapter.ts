import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";
import { CanvasHost } from "./canvas-host.adapter.js";
import type { ReturnTo } from "./canvas-host.adapter.js";

export interface CanvasMount {
	readonly opened: CanvasOpened;
	readonly keepOpening: (kept: CanvasOpening) => void;
	readonly ownsPaste: () => boolean;
	readonly gpu: GpuSupply | null;
	readonly cameFrom?: () => string;
	readonly returnTo: ReturnTo;
}

const STAYS_PUT: ReturnTo = { kind: "view", open: async () => undefined };

export class MountedCanvasHost extends CanvasHost {
	override readonly opened: CanvasOpened;
	override readonly gpu: GpuSupply | null;
	override readonly returnTo: ReturnTo;

	constructor(private readonly mount: CanvasMount) {
		super();
		this.opened = mount.opened;
		this.gpu = mount.gpu;
		this.returnTo = mount.returnTo;
	}

	override cameFrom(): string {
		return this.mount.cameFrom?.() ?? "";
	}

	override ownsPaste(): boolean {
		return this.mount.ownsPaste();
	}

	override keepOpening(kept: CanvasOpening): void {
		this.mount.keepOpening(kept);
	}
}

export function detachedMountOf(opened: CanvasOpened): CanvasMount {
	return { opened, keepOpening: keepsNothing, ownsPaste: takesNoPaste, gpu: null, returnTo: STAYS_PUT };
}

function keepsNothing(): void {}

function takesNoPaste(): boolean {
	return false;
}
