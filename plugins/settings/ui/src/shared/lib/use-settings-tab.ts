import { useContext } from "react";
import { SettingsTabContext } from "./settings-tab-context.js";

export function useSettingsTab(): string | null {
	return useContext(SettingsTabContext);
}
