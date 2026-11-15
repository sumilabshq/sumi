import { createContext, useContext } from "react";

export interface ControlMenuHandle {
	close(): void;
}

const CLOSED_MENU: ControlMenuHandle = {
	close: () => undefined,
};

export const ControlMenuContext = createContext<ControlMenuHandle>(CLOSED_MENU);

export function useControlMenu(): ControlMenuHandle {
	return useContext(ControlMenuContext);
}
