import type { PageArea } from "@sumi/contract";
import { areaInRootOf } from "./area-in-root.js";

export interface SizeWatcher {
	attach(element: HTMLDivElement): void;
	resize(): void;
	detach(): void;
}

export class AreaPlacement implements SizeWatcher {
	isPlaceable = false;
	private element: HTMLDivElement | null = null;
	private placedKey: string | null = null;

	constructor(private readonly send: (area: PageArea | null) => void) {}

	attach(element: HTMLDivElement): void {
		this.element = element;
	}

	resize(): void {
		const area = this.element === null || !this.isPlaceable ? null : areaInRootOf(this.element);

		if (area === null || JSON.stringify(area) === this.placedKey) {
			return;
		}

		this.placedKey = JSON.stringify(area);
		this.send(area);
	}

	replace(): void {
		this.placedKey = null;
		this.resize();
	}

	detach(): void {
		this.element = null;
		this.placedKey = null;

		if (this.isPlaceable) {
			this.send(null);
		}
	}
}
