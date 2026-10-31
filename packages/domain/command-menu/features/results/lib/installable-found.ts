import type { KnownApp } from "@widgetarium/app-host";
import type { Found } from "./found.js";

const APP_INSTALLER = "App installer";
const INSTALL = "Install {id}";
const UPDATE_APPS = "Update apps";
const UPDATE_KEY = "app-updates";
const INSTALLER_ROW = {
	kind: "app",
	meta: APP_INSTALLER,
	shortcut: null,
	renames: null,
	actions: [],
	host: "",
	isOnScreen: false,
} as const;

export function installableFoundOf(known: readonly KnownApp[]): readonly Found[] {
	const found = known.flatMap((app) => (app.isListed && !app.isInstalled ? [installFoundOf(app.id)] : []));
	return known.some(({ isInstalled }) => isInstalled) ? [...found, updateAppsFound()] : found;
}

function installFoundOf(id: string): Found {
	return {
		...INSTALLER_ROW,
		key: `install:${id}`,
		title: INSTALL.replace("{id}", id),
		haystack: `install ${id} app`,
		icon: {
			kind: "glyph",
			glyph: "plus",
		},
		intent: {
			do: "install-app",
			id,
			title: id,
		},
	};
}

function updateAppsFound(): Found {
	return {
		...INSTALLER_ROW,
		key: UPDATE_KEY,
		title: UPDATE_APPS,
		haystack: "update apps upgrade installer check",
		icon: {
			kind: "glyph",
			glyph: "search",
		},
		intent: {
			do: "run",
			command: "update-apps",
		},
	};
}
