import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { BackgroundModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { TasksModule as TasksContract } from "@widgetarium/tasks";
import { TasksModule } from "@widgetarium/tasks/module";
import { siteArtOf } from "./features/browser/lib/site-art.js";

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin, AppsPlugin)
	.fill(
		BackgroundModulesSlot({ id: "tasks", module: ({ file }) => TasksModule({ file }), contract: TasksContract }),
		AppsSlot({ id: "canvas", title: "Canvas", art: "canvas" }),
		AppsSlot({
			id: "browser",
			title: "Browser",
			newTabTitle: "New tab",
			art: "browser",
			artOf: siteArtOf,
			isListed: false,
			tabs: { navigates: true },
		}),
		AppsSlot({ id: "tasks", title: "Tasks", art: "tasks" }),
	);
