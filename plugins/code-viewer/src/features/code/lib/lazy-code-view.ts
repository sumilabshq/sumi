import { lazy } from "react";

export const LazyCodeView = lazy(async () => ({ default: (await import("../ui/code-view/code-view.js")).CodeView }));
