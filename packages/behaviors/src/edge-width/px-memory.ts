export interface PxMemory {
	read(): number | null;
	write(px: number): void;
}

export function localPxMemory(key: string): PxMemory {
	return {
		read: () => {
			const kept = Number(storageOrNull()?.getItem(key) ?? Number.NaN);
			return Number.isFinite(kept) && kept > 0 ? kept : null;
		},
		write: (px) => {
			try {
				storageOrNull()?.setItem(key, String(px));
			} catch (failure: unknown) {
				console.warn(`[widgetarium] ${key} could not be remembered`, failure);
			}
		},
	};
}

// TRADE-OFF: blocked site data throws on reading localStorage; Node hands a stub without methods
function storageOrNull(): Storage | null {
	try {
		const storage: Storage | undefined = globalThis.localStorage;
		return typeof storage?.getItem === "function" ? storage : null;
	} catch {
		return null;
	}
}
