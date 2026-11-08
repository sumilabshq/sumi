import { apps as appsContract } from "@sumi/apps";
import { apps as appsModule } from "@sumi/apps/module";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { places } from "@widgetarium/places";
import { places as placesModule } from "@widgetarium/places/module";
import { appsTabPageOf } from "./features/app-tab/ui/app-tab/apps-tab-page.js";
import { apps as appsSlot } from "./slots.js";
import { appHostOf } from "./features/app-tab/lib/app-host-of.js";
import { faceOf } from "./features/app-tab/lib/face-of.js";
import { placedAppOf } from "./features/app-tab/lib/placed-app-of.js";
import { titlesOfApps } from "./features/app-tab/lib/titles-of-apps.js";

export const apps = plugin()
	.require(sumiHost)
	.declare(appsSlot)
	.fill(
		sumiHost.backgroundModules.add({
			id: "places",
			module: ({ fillsOf, store }) => placesModule({ store, apps: fillsOf(appsSlot).map(placedAppOf) }),
			contract: places,
		}),
		sumiHost.backgroundModules.add({
			id: "apps",
			module: ({ fillsOf, store }) =>
				appsModule({ apps: fillsOf(appsSlot).map(faceOf), titlesOf: titlesOfApps(fillsOf(appsSlot)), store }),
			contract: appsContract,
		}),
		sumiHost.windowModules.add({ id: "app-host", module: appHostOf }),
		sumiHost.tabPage.add({ id: "apps", tabPage: ({ fillsOf }) => appsTabPageOf(fillsOf(appsSlot)) }),
	);
