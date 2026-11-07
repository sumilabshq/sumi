import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { BackgroundModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule as PlacesContract } from "@widgetarium/places";
import { PlacesModule } from "@widgetarium/places/module";
import { TasksModule as TasksContract } from "@widgetarium/tasks";
import { TasksModule } from "@widgetarium/tasks/module";

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin, AppsPlugin)
	.fill(
		BackgroundModulesSlot({ id: "places", module: ({ store }) => PlacesModule({ store }), contract: PlacesContract }),
		BackgroundModulesSlot({ id: "tasks", module: ({ file }) => TasksModule({ file }), contract: TasksContract }),
		AppsSlot({ id: "canvas", title: "Canvas", art: "canvas" }),
		AppsSlot({ id: "browser", title: "Browser", art: "browser", isListed: false }),
		AppsSlot({ id: "tasks", title: "Tasks", art: "tasks" }),
	);
