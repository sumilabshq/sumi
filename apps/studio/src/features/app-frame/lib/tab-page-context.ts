import { createContext, useContext } from "react";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";

export const TabPagesContext = createContext<readonly DrawnTabPage[]>([]);

export function useTabPageOf(app: string): DrawnTabPage | null {
	return useContext(TabPagesContext).find((page) => page.draws(app)) ?? null;
}
