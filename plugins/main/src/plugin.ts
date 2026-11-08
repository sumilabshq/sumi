import { apps } from "@sumi/apps-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { tasks } from "@widgetarium/tasks/contract";
import { tasks as tasksModule } from "@widgetarium/tasks/implementation";
import { siteArtOf } from "./features/browser/lib/site-art.js";

export const main = plugin("main")
	.require(sumiHost, apps)
	.fill(
		sumiHost.backgroundModules.add({ id: "tasks", module: ({ file }) => tasksModule({ file }), contract: tasks }),
		apps.apps.add({ id: "canvas", title: "Canvas", art: "canvas" }),
		apps.apps.add({
			id: "browser",
			title: "Browser",
			newTabTitle: "New tab",
			art: "browser",
			artOf: siteArtOf,
			isListed: false,
			tabs: { navigates: true },
		}),
		apps.apps.add({ id: "tasks", title: "Tasks", art: "tasks" }),
	);
