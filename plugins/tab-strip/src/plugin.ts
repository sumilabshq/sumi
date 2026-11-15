import { controlMenu } from "@sumi/control-menu-plugin";
import { backend, sumiHost, windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { places } from "@widgetarium/places/contract";
import { places as placesModule } from "@widgetarium/places/implementation";
import type { PlacedApp } from "@widgetarium/places/implementation";
import { appHostOf } from "./features/tab-modules/lib/app-host-of.js";
import { ControlRows } from "./features/tab-strip/ui/control-rows/control-rows.js";
import { TabStrip } from "./features/tab-strip/ui/tab-strip/tab-strip.js";

export const tabStrip = plugin("tab-strip")
	.require(sumiHost, controlMenu, backend, windows)
	.apply((app) => {
		const placedApps: PlacedApp[] = [];
		app.use(backend).moduleOf(({ store }) => placesModule({ store, apps: placedApps }), places);
		app.use(windows).moduleOf(appHostOf);
		app.use(sumiHost).slots.titleTabs.add(TabStrip);
		app.use(controlMenu).slots.rows.add(ControlRows);
		return {
			app: (placed: PlacedApp): void => {
				placedApps.push(placed);
			},
		};
	});
