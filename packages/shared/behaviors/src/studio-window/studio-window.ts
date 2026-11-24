export interface StudioWindow {
	readonly label: string;
	readonly bootTab: string | null;
	readonly bootChat: string | null;
	readonly isMain: boolean;
	readonly profile: string | null;
}

export const MAIN_STUDIO_WINDOW = "main";

export const NO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

const PLACES_WINDOW_JOIN = "@";

export function placesWindowOf(label: string, workspaceId: string): string {
	return `${label}${PLACES_WINDOW_JOIN}${workspaceId}`;
}

export function placesWindowHere(search: string | null, workspaceId: string): string {
	return placesWindowOf(search === null ? MAIN_STUDIO_WINDOW : studioWindowOf(search).label, workspaceId);
}

export interface PlacesWindowPage {
	readonly platform: string;
	readonly search: string;
	readonly workspaceId: string;
}

const SEARCH_PLATFORM = "tauri";

export function placesWindowOfPage({ platform, search, workspaceId }: PlacesWindowPage): string {
	return placesWindowHere(platform === SEARCH_PLATFORM ? search : null, workspaceId);
}

export function labelOfPlacesWindow(placesWindow: string): string {
	return placesWindow.split(PLACES_WINDOW_JOIN)[0] ?? placesWindow;
}

export function isPlacesWindowOfWorkspace(placesWindow: string): boolean {
	return placesWindow.includes(PLACES_WINDOW_JOIN);
}

const WINDOW_PARAM = "window";
const TAB_PARAM = "tab";
const CHAT_PARAM = "chat";
const PROFILE_PARAM = "profile";
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
		profile: asked.get(PROFILE_PARAM),
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
