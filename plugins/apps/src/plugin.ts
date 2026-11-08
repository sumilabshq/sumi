import { apps as appsContract } from "@sumi/apps/contract";
import { apps as appsModule } from "@sumi/apps/implementation";
import { backend, shell, windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { places } from "@widgetarium/places/contract";
import { places as placesModule } from "@widgetarium/places/implementation";
import { appsTabPageOf } from "./features/app-tab/ui/app-tab/apps-tab-page.js";
import type { FilledApp } from "./features/app-tab/ui/app-tab/app-tab.js";
import { appHostOf } from "./features/app-tab/lib/app-host-of.js";
import { faceOf } from "./features/app-tab/lib/face-of.js";
import { placedAppOf } from "./features/app-tab/lib/placed-app-of.js";
import { titlesOfApps } from "./features/app-tab/lib/titles-of-apps.js";

export const apps = plugin("apps")
	.require(backend, windows, shell)
	.apply((app) => {
		const filled: FilledApp[] = [];
		app.use(backend).moduleOf(({ store }) => placesModule({ store, apps: filled.map(placedAppOf) }), places);
		app.use(backend).moduleOf(
			({ store }) => appsModule({ apps: filled.map(faceOf), titlesOf: titlesOfApps(filled), store }),
			appsContract,
		);
		app.use(windows).moduleOf(appHostOf);
		app.use(shell).tabPage(appsTabPageOf(filled));
		return {
			app: (entry: FilledApp): void => {
				filled.push(entry);
			},
		};
	});
