export interface ChatWidthMemory {
	read(): number | null;
	write(px: number): void;
}

const CHAT_WIDTH_KEY = "widgetarium-studio-chat-px";

export function localChatWidthMemory(): ChatWidthMemory {
	return {
		read: () => {
			const kept = Number(storageOrNull()?.getItem(CHAT_WIDTH_KEY) ?? Number.NaN);
			return Number.isFinite(kept) ? kept : null;
		},
		write: (px) => {
			try {
				storageOrNull()?.setItem(CHAT_WIDTH_KEY, String(px));
			} catch (failure: unknown) {
				console.warn("[widgetarium] the studio chat width could not be remembered", failure);
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
