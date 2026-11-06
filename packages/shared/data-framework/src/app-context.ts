import { createContext, useContext } from "react";
import type { StartedApp } from "./app";

const NO_APP = "{hook} needs an <AppProvider> above it";

export const APP = createContext<StartedApp | null>(null);

export function useApp(hook: string): StartedApp {
	const held = useContext(APP);
	if (held === null) throw new Error(NO_APP.replace("{hook}", hook));
	return held;
}
