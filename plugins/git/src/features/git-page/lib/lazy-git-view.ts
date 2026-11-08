import { lazy } from "react";

export const LazyGitView = lazy(async () => ({ default: (await import("../ui/git-view/git-view.js")).GitView }));
