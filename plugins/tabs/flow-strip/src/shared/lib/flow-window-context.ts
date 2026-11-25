import { createContext, useContext } from "react";

export const NO_WINDOW = "no-window";

export const FlowWindowContext = createContext<string>(NO_WINDOW);

export function useFlowWindow(): string {
	return useContext(FlowWindowContext);
}
