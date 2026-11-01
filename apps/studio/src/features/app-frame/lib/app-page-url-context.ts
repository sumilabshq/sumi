import { createContext, useContext } from "react";
import { sumiAppPageUrlOf } from "@widgetarium/app-registry";
import type { AppPageUrlOf } from "@widgetarium/app-registry";

export const AppPageUrlContext = createContext<AppPageUrlOf>(sumiAppPageUrlOf);

export function useAppPageUrlOf(): AppPageUrlOf {
	return useContext(AppPageUrlContext);
}
