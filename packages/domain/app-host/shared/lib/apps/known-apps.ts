import type { Send } from "@widgetarium/core/requests";
import { AppRegistryQuery, InstalledAppsQuery } from "@widgetarium/app-installer";
import type { AppRegistry, InstalledApps } from "@widgetarium/app-installer";
import { AppFacesQuery as BuiltInFacesQuery } from "@widgetarium/places";
import type { AppFace, KnownApp } from "../../schema/app-tab.schema.js";

interface Faces {
	readonly faces: readonly AppFace[];
}

const INSTALLED_APP_ICON = "built-app";

export async function readAppFaces(send: Send): Promise<Faces> {
	const [builtIn, installed] = await Promise.all([send(BuiltInFacesQuery), send(InstalledAppsQuery)]);
	return withInstalledFaces(builtIn, installed);
}

export async function readKnownApps(send: Send): Promise<readonly KnownApp[]> {
	const [builtIn, installed, registry] = await Promise.all([
		send(BuiltInFacesQuery),
		send(InstalledAppsQuery),
		send(AppRegistryQuery),
	]);
	return knownAppsOf(withInstalledFaces(builtIn, installed), installed, registry);
}

export function isKnownApp(known: readonly KnownApp[], id: string): boolean {
	return known.some((app) => app.id === id);
}

function withInstalledFaces({ faces }: Faces, { apps }: InstalledApps): Faces {
	const installed: readonly AppFace[] = apps.flatMap(({ id, face }) =>
		face === null
			? []
			: [
					{
						app: id,
						title: face.name,
						icon: INSTALLED_APP_ICON,
						isBuiltIn: false,
					},
				],
	);
	const replaced = new Set(installed.map(({ app }) => app));
	return {
		faces: [...faces.filter(({ app }) => !replaced.has(app)), ...installed],
	};
}

function knownAppsOf({ faces }: Faces, installed: InstalledApps, registry: AppRegistry): readonly KnownApp[] {
	const installedIds = new Set(installed.apps.filter(({ current }) => current !== null).map(({ id }) => id));
	const listedIds = new Set(registry.apps.map(({ id }) => id));
	const ids = new Set([...faces.map(({ app }) => app), ...installedIds, ...listedIds]);
	return [...ids].map((id) => ({
		id,
		isBuiltIn: faces.some((face) => face.app === id && face.isBuiltIn),
		isInstalled: installedIds.has(id),
		isListed: listedIds.has(id),
	}));
}
