import { lazy } from "react";

export const LazyTerminalView = lazy(async () => ({ default: (await import("../ui/terminal-view/terminal-view.js")).TerminalView }));
