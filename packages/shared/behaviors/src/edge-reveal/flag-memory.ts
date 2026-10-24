import { storageOrNull } from "../edge-width/px-memory.js";

export interface FlagMemory {
	read(): boolean | null;
	write(flag: boolean): void;
}

const ON = "1";
const OFF = "0";

export function localFlagMemory(key: string): FlagMemory {
	return {
		read: () => readFlag(key),
		write: (flag) => writeFlag(key, flag),
	};
}

function readFlag(key: string): boolean | null {
	const kept = storageOrNull()?.getItem(key) ?? null;

	if (kept !== ON && kept !== OFF) {
		return null;
	}

	return kept === ON;
}

function writeFlag(key: string, flag: boolean): void {
	try {
		storageOrNull()?.setItem(key, flag ? ON : OFF);
	} catch (failure: unknown) {
		console.warn(`[widgetarium] ${key} could not be remembered`, failure);
	}
}
