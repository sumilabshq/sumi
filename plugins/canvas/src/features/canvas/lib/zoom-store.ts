import { useSyncExternalStore } from "react";

export interface CameraLook {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

export interface CameraSteering {
	readonly fitNow: () => CameraLook | null;
	readonly lookNow: () => CameraLook;
	readonly flyTo: (look: CameraLook) => void;
	readonly fieldOf: () => HTMLElement | null;
}

const NOT_STEERED = "[canvas] zoom {asked} skipped: no field is drawn to steer";
const NOT_MEASURED = "[canvas] zoom to fit skipped: the field is not measured yet";

export class ZoomStore {
	private zoom = 1;
	private steering: CameraSteering | null = null;
	private readonly listeners = new Set<() => void>();

	now = (): number => this.zoom;

	watch = (changed: () => void): (() => void) => {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	};

	show(zoom: number): void {
		if (zoom === this.zoom) {
			return;
		}

		this.zoom = zoom;

		for (const changed of [...this.listeners]) {
			changed();
		}
	}

	steerWith(steering: CameraSteering): () => void {
		this.steering = steering;
		return () => {
			if (this.steering === steering) {
				this.steering = null;
			}
		};
	}

	fit(): void {
		const { steering } = this;

		if (steering === null) {
			console.info(NOT_STEERED.replace("{asked}", "to fit"));
			return;
		}

		const look = steering.fitNow();

		if (look === null) {
			console.info(NOT_MEASURED);
			return;
		}

		steering.flyTo(look);
	}

	zoomTo(scale: number): void {
		const { steering } = this;

		if (steering === null) {
			console.info(NOT_STEERED.replace("{asked}", percentOf(scale)));
			return;
		}

		const field = steering.fieldOf();
		const centre = {
			x: (field?.clientWidth ?? 0) / 2,
			y: (field?.clientHeight ?? 0) / 2,
		};
		const look = steering.lookNow();
		const ratio = scale / look.scale;
		steering.flyTo({
			x: centre.x - (centre.x - look.x) * ratio,
			y: centre.y - (centre.y - look.y) * ratio,
			scale,
		});
	}
}

export function useZoom(store: ZoomStore): number {
	return useSyncExternalStore(store.watch, store.now);
}

export function percentOf(scale: number): string {
	return `${Math.round(scale * 100)}%`;
}
