export interface StudioWindow {
	readonly label: string;
	readonly bootTab: string | null;
	readonly bootChat: string | null;
	readonly isMain: boolean;
}

export const MAIN_STUDIO_WINDOW = "main";

const WINDOW_PARAM = "window";
const TAB_PARAM = "tab";
const CHAT_PARAM = "chat";
const GHOST_PARAM = "ghost";
const CORE_PARAM = "core";
const SHARED_VIEW_FILE = "session.json";

export function studioWindowOf(search: string): StudioWindow {
	const asked = new URLSearchParams(search);
	const label = asked.get(WINDOW_PARAM) ?? MAIN_STUDIO_WINDOW;
	return {
		label,
		bootTab: asked.get(TAB_PARAM),
		bootChat: asked.get(CHAT_PARAM),
		isMain: label === MAIN_STUDIO_WINDOW,
	};
}

export function isTearOffGhostPage(search: string): boolean {
	return new URLSearchParams(search).has(GHOST_PARAM);
}

export function isCorePage(search: string): boolean {
	return new URLSearchParams(search).has(CORE_PARAM);
}

export function viewFileOf(window: StudioWindow): string {
	return window.isMain ? SHARED_VIEW_FILE : `window-${window.label}.json`;
}
