import { createContext } from "react";
import type { StartedApp } from "@widgetarium/core/requests";

export const ShellAppContext = createContext<StartedApp | null>(null);
