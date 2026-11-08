import { apps } from "@sumi/apps-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { tasks } from "@widgetarium/tasks/contract";
import { tasks as tasksModule } from "@widgetarium/tasks/implementation";
import { siteArtOf } from "./features/browser/lib/site-art.js";

export const main = plugin("main")
	.require(backend, apps)
	.apply((app) => {
		app.use(backend).moduleOf(({ file }) => tasksModule({ file }), tasks);
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
		app.use(apps).app({ id: "tasks", title: "Tasks", art: "tasks" });
	});
