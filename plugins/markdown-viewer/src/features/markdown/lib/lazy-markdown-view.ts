import { lazy } from "react";

export const LazyMarkdownView = lazy(async () => ({
	default: (await import("../ui/markdown-view/markdown-view.js")).MarkdownView,
}));
