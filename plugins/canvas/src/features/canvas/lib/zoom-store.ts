import { useSyncExternalStore } from "react";

export class ZoomStore {
	private zoom = 1;
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
}

export function useZoom(store: ZoomStore): number {
	return useSyncExternalStore(store.watch, store.now);
}
