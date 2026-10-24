import { createContext, useContext } from "react";

export type TopBarLook = "raised" | "ghost";

export const TopBarLookContext = createContext<TopBarLook>("raised");

export function useTopBarLook(): TopBarLook {
	return useContext(TopBarLookContext);
}
