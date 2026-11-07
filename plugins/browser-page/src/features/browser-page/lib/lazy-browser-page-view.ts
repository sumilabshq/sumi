import { lazy } from "react";

export const LazyBrowserPageView = lazy(async () => ({
	default: (await import("./browser-page-view.js")).BrowserPageView,
}));
