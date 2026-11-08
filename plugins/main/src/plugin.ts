import { apps } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { siteArtOf } from "./features/browser/lib/site-art.js";

export const main = plugin("main")
	.require(apps)
	.apply((app) => {
		app.use(apps).app({ id: "canvas", title: "Canvas", art: "canvas" });
		app.use(apps).app({
			id: "browser",
			title: "Browser",
			newTabTitle: "New tab",
			art: "browser",
			artOf: siteArtOf,
			isListed: false,
			tabs: { navigates: true },
		});
	});
