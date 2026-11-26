import { useContext } from "react";
import type { Runtime } from "@widgetarium/data-framework";
import { WindowAppContext } from "./window-app-context.js";

export function useWindowApp(): Runtime | null {
	return useContext(WindowAppContext);
}
