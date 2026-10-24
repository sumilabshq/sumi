import { storageOrNull } from "./px-memory.js";

export interface JsonMemory<T> {
	read(): unknown;
	write(value: T, reason: string): void;
}

export function localJsonMemory<T>(key: string): JsonMemory<T> {
	return {
		read: () => parsedJsonOf(storageOrNull()?.getItem(key) ?? null),
		write: (value) => writeJson(key, value),
	};
}

function parsedJsonOf(kept: string | null): unknown {
	return kept === null ? null : JSON.parse(kept);
}

function writeJson(key: string, value: unknown): void {
	try {
		storageOrNull()?.setItem(key, JSON.stringify(value));
	} catch (failure: unknown) {
		console.warn(`[widgetarium] ${key} could not be remembered`, failure);
	}
}
