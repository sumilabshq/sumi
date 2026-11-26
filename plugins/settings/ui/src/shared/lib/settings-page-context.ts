import { createContext } from "react";
import type { SettingsPageEntry } from "@sumi/settings-registry-plugin";

export const SettingsPageContext = createContext<SettingsPageEntry | null>(null);
