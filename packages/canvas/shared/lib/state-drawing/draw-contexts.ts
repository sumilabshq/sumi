import { createContext } from "react";

export const DRAWS_AT_ONCE = createContext(false);

export const REPORTS_DRAW_FAILURE = createContext<((failure: unknown) => void) | null>(null);
