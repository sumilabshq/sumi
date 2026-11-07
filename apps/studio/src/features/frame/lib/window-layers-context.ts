import { createContext, useContext } from "react";
import type { WindowLayer } from "../../../plugins/sumi-plugins.js";

export const WindowLayersContext = createContext<readonly WindowLayer[]>([]);

export function useWindowLayers(): readonly WindowLayer[] {
	return useContext(WindowLayersContext);
}
