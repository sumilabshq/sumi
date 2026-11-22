import { createContext } from "react";
import type { Runtime } from "@widgetarium/data-framework";

export const WindowAppContext = createContext<Runtime | null>(null);
