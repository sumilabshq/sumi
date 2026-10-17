import { NO_INSETS } from "@widgetarium/core/engine/studio-host.js";
import type { ChromeInsets } from "@widgetarium/core/engine/studio-host.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { PROJECT_CONFIG_FILE } from "@widgetarium/core/project/index.js";

export const APP_KEY = "widgetarium-app";
export const ROUTE_KEY = "widgetarium-route";

export interface StudioNote {
	readonly folder: string;
	readonly route: string;
}

export interface ChromeRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
}

export type WindowSystem = "mac" | "windows" | "other";

export interface WindowChrome {
	readonly rect: ChromeRect;
	readonly innerWidth: number;
	readonly system: WindowSystem;
	readonly isHiddenFrameless: boolean;
}

const ROOT_ROUTE = "/";
const NOTE_EXTENSION = "md";
const UNSAFE_IN_NAME = /[/\\:]/g;
const NAME_STAND_IN = "-";
const EDGE_SLASHES = /^\/+|\/+$/g;
const TRAFFIC_LIGHTS = { reachPx: 80, bottomPx: 32, insetPx: 76 };
const CAPTION_BUTTONS = { reachPx: 140, bottomPx: 32, insetPx: 138 };

export function studioNoteOf(frontmatter: unknown): StudioNote | null {
	if (!isObject(frontmatter)) return null;
	const folder = frontmatter[APP_KEY];
	if (typeof folder !== "string") return null;
	const trimmed = folder.trim().replace(EDGE_SLASHES, "");
	if (trimmed === "") return null;
	return { folder: trimmed, route: routeOf(frontmatter[ROUTE_KEY]) };
}

export function projectFoldersOf(paths: readonly string[]): string[] {
	const suffix = `/${PROJECT_CONFIG_FILE}`;
	return paths
		.filter((path) => path.endsWith(suffix))
		.map((path) => path.slice(0, -suffix.length))
		.sort();
}

export function numberedName(base: string, count: number): string {
	const name = base.replace(UNSAFE_IN_NAME, NAME_STAND_IN);
	return count === 1 ? name : `${name} ${count}`;
}

export function appNotePathOf(folder: string): string {
	return `${folder}.${NOTE_EXTENSION}`;
}

export function isSameStudioNote(shown: StudioNote | null, now: StudioNote | null): boolean {
	return shown?.folder === now?.folder && shown?.route === now?.route;
}

export function renamedFolderOf(named: string, was: string, now: string): string | null {
	if (named === was) return now;
	return named.startsWith(`${was}/`) ? `${now}${named.slice(was.length)}` : null;
}

export function renamedPathOf(folder: string, name: string): string {
	const parentEnd = folder.lastIndexOf("/") + 1;
	return `${folder.slice(0, parentEnd)}${numberedName(name.trim(), 1)}`;
}

export function studioParamsKeyOf(notePath: string, leafKey: string, pathname: string): string {
	return `${notePath}#${leafKey}${pathname}`;
}

export function chromeInsetsOf({ rect, innerWidth, system, isHiddenFrameless }: WindowChrome): ChromeInsets {
	if (rect.right <= rect.left) return NO_INSETS;
	const top = Math.round(rect.top);
	const touchesTrafficLights = Math.round(rect.left) < TRAFFIC_LIGHTS.reachPx && top < TRAFFIC_LIGHTS.bottomPx;
	if (system === "mac" && isHiddenFrameless && touchesTrafficLights) return { left: TRAFFIC_LIGHTS.insetPx, right: 0 };
	const touchesCaptionButtons =
		Math.round(rect.right) > innerWidth - CAPTION_BUTTONS.reachPx && top < CAPTION_BUTTONS.bottomPx;
	if (system === "windows" && touchesCaptionButtons) return { left: 0, right: CAPTION_BUTTONS.insetPx };
	return NO_INSETS;
}

export function appNoteText(folder: string): string {
	return `---\n${APP_KEY}: ${JSON.stringify(folder)}\n---\n`;
}

function routeOf(held: unknown): string {
	if (typeof held !== "string" || held.trim() === "") return ROOT_ROUTE;
	const route = held.trim();
	return route.startsWith(ROOT_ROUTE) ? route : `${ROOT_ROUTE}${route}`;
}
