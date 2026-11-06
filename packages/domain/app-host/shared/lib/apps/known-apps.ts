import type { Send } from "@widgetarium/data-framework";
import { REGISTERED_APPS } from "@widgetarium/app-registry";
import type { RegisteredApp } from "@widgetarium/app-registry";
import { AppFacesQuery as BuiltInFacesQuery } from "@widgetarium/places";
import type { PluginAppFace } from "../../host/app-host.host.js";
import { TabArtSchema } from "../../schema/app-tab.schema.js";
import type { AppFace, KnownApp, TabArt } from "../../schema/app-tab.schema.js";

interface Faces {
	readonly faces: readonly AppFace[];
}

const INSTALLED_APP_ICON: TabArt = "built-app";

export async function readAppFaces(send: Send, pluginApps: readonly PluginAppFace[]): Promise<Faces> {
	const { faces } = await send(BuiltInFacesQuery);
	const installed = [
		...REGISTERED_APPS.map((registered) => withShellFace(registeredFaceOf(registered), faces)),
		...pluginApps.map(pluginFaceOf),
	];
	const installedIds = new Set(installed.map(({ app }) => app));
	return {
		faces: [...faces.filter(({ app }) => !installedIds.has(app)), ...installed],
	};
}

export async function readKnownApps(send: Send, pluginApps: readonly PluginAppFace[]): Promise<readonly KnownApp[]> {
	const { faces } = await readAppFaces(send, pluginApps);
	return faces.map(({ app, isBuiltIn }) => ({
		id: app,
		isBuiltIn,
	}));
}

export function isKnownApp(known: readonly KnownApp[], id: string): boolean {
	return known.some((app) => app.id === id);
}

function registeredFaceOf({ id, name }: RegisteredApp): AppFace {
	return {
		app: id,
		title: name,
		icon: INSTALLED_APP_ICON,
		isBuiltIn: false,
	};
}

function pluginFaceOf({ id, title, icon }: PluginAppFace): AppFace {
	const art = TabArtSchema.safeParse(icon);
	return {
		app: id,
		title,
		icon: art.success ? art.data : INSTALLED_APP_ICON,
		isBuiltIn: false,
	};
}

function withShellFace(installed: AppFace, shellFaces: readonly AppFace[]): AppFace {
	const shellFace = shellFaces.find(({ app }) => app === installed.app);
	return shellFace === undefined ? installed : { ...installed, title: shellFace.title, icon: shellFace.icon };
}
