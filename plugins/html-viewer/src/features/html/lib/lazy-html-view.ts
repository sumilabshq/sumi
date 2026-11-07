import { lazy } from "react";

export const LazyHtmlView = lazy(async () => ({ default: (await import("../ui/html-view/html-view.js")).HtmlView }));
