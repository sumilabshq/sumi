import { apps } from "@sumi/apps-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { webPage } from "@widgetarium/web-page";
import { BROWSER_PAGE_ICON } from "./features/browser-page/lib/browser-page-icon.js";
import { LazyBrowserPageView } from "./features/browser-page/lib/lazy-browser-page-view.js";
import { webPageServingOf } from "./features/web-page/lib/web-page-serving.js";
import { ReloadPageAction } from "./features/web-page/ui/reload-page-action/reload-page-action.js";

export const browserPage = plugin()
	.require(sumiHost, apps)
	.fill(
		apps.apps.add({
			id: "browser-page",
			title: "Browser",
			icon: BROWSER_PAGE_ICON,
			view: LazyBrowserPageView,
			actions: [ReloadPageAction],
		}),
		sumiHost.frameModules.add({ id: "web-page", contract: webPage, serving: webPageServingOf }),
	);
