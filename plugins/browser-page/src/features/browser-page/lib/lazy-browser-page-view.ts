import { lazy } from "react";

export const LazyBrowserPageView = lazy(async () => ({
	default: (await import("../ui/browser-page-view/browser-page-view.js")).BrowserPageView,
}));
