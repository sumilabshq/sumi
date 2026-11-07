import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { BROWSER_PAGE_ICON } from "./features/browser-page/lib/browser-page-icon.js";
import { LazyBrowserPageView } from "./features/browser-page/lib/lazy-browser-page-view.js";

export const BrowserPagePlugin = plugin("browser-page")
	.require(AppsPlugin)
	.fill(AppsSlot({ id: "browser-page", title: "Browser", icon: BROWSER_PAGE_ICON, view: LazyBrowserPageView }));
