import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { FrameModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { WebPageModule } from "@widgetarium/web-page";
import { BROWSER_PAGE_ICON } from "./features/browser-page/lib/browser-page-icon.js";
import { LazyBrowserPageView } from "./features/browser-page/lib/lazy-browser-page-view.js";
import { webPageServingOf } from "./features/web-page/lib/web-page-serving.js";

export const BrowserPagePlugin = plugin("browser-page")
	.require(SumiHostPlugin, AppsPlugin)
	.fill(
		AppsSlot({ id: "browser-page", title: "Browser", icon: BROWSER_PAGE_ICON, view: LazyBrowserPageView }),
		FrameModulesSlot({ id: "web-page", contract: WebPageModule, serving: webPageServingOf }),
	);
