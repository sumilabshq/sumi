import { createContext, useContext } from "react";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";

export const TabPageContext = createContext<DrawnTabPage | null>(null);

export function useTabPage(): DrawnTabPage | null {
	return useContext(TabPageContext);
}
