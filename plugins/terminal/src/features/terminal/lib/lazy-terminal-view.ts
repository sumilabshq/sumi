import { lazy } from "react";

export const LazyTerminalView = lazy(async () => ({ default: (await import("./terminal-view.js")).TerminalView }));
