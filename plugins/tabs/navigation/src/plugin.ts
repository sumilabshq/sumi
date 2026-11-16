import { backend, windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { navigation as navigationContract } from "@widgetarium/navigation/contract";
import { navigation as navigationModule } from "@widgetarium/navigation/implementation";
import type { PlacedApp } from "@widgetarium/navigation/implementation";
import { appHostOf } from "./features/navigation-modules/lib/app-host-of.js";

export const navigation = plugin("navigation")
	.require(backend, windows)
	.apply((app) => {
		const placedApps: PlacedApp[] = [];
		app.use(backend).moduleOf(({ store }) => navigationModule({ store, apps: placedApps }), navigationContract);
		app.use(windows).moduleOf(appHostOf);
		return {
			placedApps,
			app: (placed: PlacedApp): void => {
				placedApps.push(placed);
			},
		};
	});
