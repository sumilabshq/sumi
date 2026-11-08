import { apps } from "@sumi/apps-plugin";
import { mcp } from "@sumi/mcp-plugin";
import { pages } from "@sumi/pages/implementation";
import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { webPage } from "@widgetarium/web-page/contract";
import { BROWSER_PAGE_ICON } from "./features/browser-page/lib/browser-page-icon.js";
import { LazyBrowserPageView } from "./features/browser-page/lib/lazy-browser-page-view.js";
import { webPageServingOf } from "./features/web-page/lib/web-page-serving.js";
import { ReloadPageAction } from "./features/web-page/ui/reload-page-action/reload-page-action.js";

export const browserPage = plugin("browser-page")
	.require(shell, apps, mcp)
	.apply((app) => {
		app.use(apps).app({
			id: "browser-page",
			title: "Browser",
			icon: BROWSER_PAGE_ICON,
			view: LazyBrowserPageView,
			actions: [ReloadPageAction],
		});
		app.use(shell).frameModule(webPage, webPageServingOf);
		app.use(mcp).server({ name: "browser", modules: [pages] });
	});
