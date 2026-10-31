import { refuse } from "@widgetarium/core/requests";
import type { User } from "@widgetarium/core/requests";

export type PlacedPath =
	| {
			readonly path: string;
	  }
	| {
			readonly refusal: string;
	  };

export interface AppDataHolder {
	appDataFolder(): Promise<string>;
}

const APP_DATA_FOLDER = "app-data";
const APP_ID = /^[a-z][a-z0-9-]*$/;
const NO_APP = "only an app may reach files: the call carries no app";
const BAD_APP = "the app id {value} cannot name a folder";
const NUL_IN_PATH = "the path {value} holds a NUL character";
const LEAVES_APP_DATA = "the path {value} climbs out of the app's own folder; name it absolute instead";

export function placedPathOf(appDataFolder: string, user: User | null, path: string): PlacedPath {
	const refusal = refusalOf(user, path);

	if (refusal !== null || user === null) {
		return {
			refusal: refusal ?? NO_APP,
		};
	}

	if (path.startsWith("/")) {
		return {
			path,
		};
	}

	const parts = path.split("/").filter((part) => part !== "" && part !== ".");
	return {
		path: [appDataFolder.replace(/\/+$/, ""), APP_DATA_FOLDER, user.id, ...parts].join("/"),
	};
}

export async function placedIn(holder: AppDataHolder, user: User | null, path: string): Promise<string> {
	const placed = placedPathOf(await holder.appDataFolder(), user, path);

	if ("refusal" in placed) {
		return refuse(placed.refusal);
	}

	return placed.path;
}

export function refusedFailure(failure: unknown): never {
	return refuse(failure instanceof Error ? failure.message : String(failure));
}

function refusalOf(user: User | null, path: string): string | null {
	if (user === null) {
		return NO_APP;
	}

	if (!APP_ID.test(user.id)) {
		return BAD_APP.replace("{value}", JSON.stringify(user.id));
	}

	if (path.includes("\0")) {
		return NUL_IN_PATH.replace("{value}", JSON.stringify(path));
	}

	const climbs = !path.startsWith("/") && path.split("/").includes("..");
	return climbs ? LEAVES_APP_DATA.replace("{value}", JSON.stringify(path)) : null;
}
