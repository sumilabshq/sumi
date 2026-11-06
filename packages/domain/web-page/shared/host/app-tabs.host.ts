import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export interface AppTabs {
	appOfTab(tab: string): Promise<string | null>;
}

export const AppTabsHost = hostObject<AppTabs>("AppTabs", isAppTabs);

function isAppTabs(held: unknown): held is AppTabs {
	return isObject(held) && typeof held["appOfTab"] === "function";
}
