import { createContext, useContext } from "react";
import type { App } from "./sends";

const NO_APP = "{hook} needs an <AppProvider> above it";

export const APP = createContext<App | null>(null);

export function useApp(hook: string): App {
	const held = useContext(APP);
	if (held === null) throw new Error(NO_APP.replace("{hook}", hook));
	return held;
}
