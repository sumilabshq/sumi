import type { GpuSupply } from "@widgetarium/gpu";
import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";
import { CanvasHost } from "./canvas-host.adapter.js";
import type { CanvasMount } from "./canvas-host.adapter.js";

export class MountedCanvasHost extends CanvasHost {
	override readonly opened: CanvasOpened;
	override readonly gpu: GpuSupply | null;

	constructor(private readonly mount: CanvasMount) {
		super();
		this.opened = mount.opened;
		this.gpu = mount.gpu;
	}

	override ownsPaste(): boolean {
		return this.mount.ownsPaste();
	}

	override keepOpening(kept: CanvasOpening): void {
		this.mount.keepOpening(kept);
	}
}
