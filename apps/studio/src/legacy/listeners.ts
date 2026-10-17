export interface Listeners {
	subscribe(changed: () => void): () => void;
	notify(): void;
}

export function createListeners(): Listeners {
	const listeners = new Set<() => void>();
	return {
		subscribe: (changed) => {
			listeners.add(changed);
			return () => listeners.delete(changed);
		},
		notify: () => {
			for (const changed of listeners) changed();
		},
	};
}
