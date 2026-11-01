import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export interface AppTabs {
	appOfTab(tab: string): Promise<string | null>;
}

export const AppTabsHost = hostObject<AppTabs>("AppTabs", isAppTabs);

function isAppTabs(held: unknown): held is AppTabs {
	return isObject(held) && typeof held["appOfTab"] === "function";
}
