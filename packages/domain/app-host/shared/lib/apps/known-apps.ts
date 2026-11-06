import type { Send } from "@widgetarium/data-framework";
import { REGISTERED_APPS } from "@widgetarium/app-registry";
import type { RegisteredApp } from "@widgetarium/app-registry";
import { AppFacesQuery as BuiltInFacesQuery } from "@widgetarium/places";
import type { AppFace, KnownApp } from "../../schema/app-tab.schema.js";

interface Faces {
	readonly faces: readonly AppFace[];
}

const REGISTERED_APP_ICON = "built-app";

export async function readAppFaces(send: Send): Promise<Faces> {
	return withRegisteredFaces(await send(BuiltInFacesQuery), REGISTERED_APPS);
}

export async function readKnownApps(send: Send): Promise<readonly KnownApp[]> {
	const { faces } = await readAppFaces(send);
	return faces.map(({ app, isBuiltIn }) => ({
		id: app,
		isBuiltIn,
	}));
}

export function isKnownApp(known: readonly KnownApp[], id: string): boolean {
	return known.some((app) => app.id === id);
}

function withRegisteredFaces({ faces }: Faces, registered: readonly RegisteredApp[]): Faces {
	const registeredFaces: readonly AppFace[] = registered.map(({ id, name }) => {
		const shellFace = faces.find(({ app }) => app === id);
		return {
			app: id,
			title: shellFace?.title ?? name,
			icon: shellFace?.icon ?? REGISTERED_APP_ICON,
			isBuiltIn: false,
		};
	});
	const registeredIds = new Set(registered.map(({ id }) => id));
	return {
		faces: [...faces.filter(({ app }) => !registeredIds.has(app)), ...registeredFaces],
	};
}
