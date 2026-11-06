import { createContext, useContext } from "react";
import type { PluginApp } from "@sumi/apps-plugin";

export const AppViewsContext = createContext<readonly PluginApp[]>([]);

export function usePluginAppOf(app: string): PluginApp | null {
	return useContext(AppViewsContext).find(({ id }) => id === app) ?? null;
}
