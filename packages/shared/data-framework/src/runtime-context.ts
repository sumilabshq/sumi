import { createContext, useContext } from "react";
import type { Runtime } from "./runtime";

const NO_RUNTIME = "{callerName} needs a <RuntimeProvider> above it";

export const RUNTIME = createContext<Runtime | null>(null);

export function useRuntime(callerName: string): Runtime {
	const held = useContext(RUNTIME);
	if (held === null) throw new Error(NO_RUNTIME.replace("{callerName}", callerName));
	return held;
}
