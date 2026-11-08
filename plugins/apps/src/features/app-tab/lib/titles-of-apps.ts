import type { TitleOf } from "./app-types.js";
import type { FilledApp } from "../ui/app-tab/app-tab.js";

export function titlesOfApps(apps: readonly FilledApp[]): ReadonlyMap<string, TitleOf> {
	return new Map(apps.flatMap(({ id, titleOf }) => (titleOf === undefined ? [] : [[id, titleOf] as const])));
}
