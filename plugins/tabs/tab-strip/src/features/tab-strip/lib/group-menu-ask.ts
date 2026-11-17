import { useSyncExternalStore } from "react";

let askedGroupId: string | null = null;
const listeners = new Set<() => void>();

export function openGroupMenu(groupId: string): void {
	askedGroupId = groupId;
	listeners.forEach((listener) => listener());
}

export function closeGroupMenu(): void {
	askedGroupId = null;
	listeners.forEach((listener) => listener());
}

export function useAskedGroupMenu(): string | null {
	return useSyncExternalStore(subscribe, () => askedGroupId);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
