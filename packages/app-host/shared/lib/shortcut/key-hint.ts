const IS_MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "");

export const COMMAND_KEY = IS_MAC ? "⌘" : "Ctrl";

export function keyHintOf(key: string, isShifted: boolean): string {
	const shown = key.toUpperCase();

	if (IS_MAC) {
		return isShifted ? `⇧⌘${shown}` : `⌘${shown}`;
	}

	return isShifted ? `Ctrl+Shift+${shown}` : `Ctrl+${shown}`;
}
