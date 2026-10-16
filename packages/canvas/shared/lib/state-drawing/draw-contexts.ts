import { createContext } from "react";

export const REPORTS_DRAW_FAILURE = createContext<((failure: unknown) => void) | null>(null);
