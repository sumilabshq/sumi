import { AppsModule as AppsContract } from "@sumi/apps";
import { AppsModule } from "@sumi/apps/module";
import { BackgroundModulesSlot, SumiHostPlugin, TabPageSlot } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule as PlacesContract } from "@widgetarium/places";
import { PlacesModule } from "@widgetarium/places/module";
import { appsTabPageOf } from "./features/app-tab/ui/app-tab/apps-tab-page.js";
import { AppsSlot } from "./slots.js";
import { faceOf } from "./features/app-tab/lib/face-of.js";
import { placedAppOf } from "./features/app-tab/lib/placed-app-of.js";
import { titlesOfApps } from "./features/app-tab/lib/titles-of-apps.js";

export const AppsPlugin = plugin("apps")
	.require(SumiHostPlugin)
	.declare(AppsSlot)
	.fill(
		BackgroundModulesSlot({
			id: "places",
			module: ({ fillsOf, store }) => PlacesModule({ store, apps: fillsOf(AppsSlot).map(placedAppOf) }),
			contract: PlacesContract,
		}),
		BackgroundModulesSlot({
			id: "apps",
			module: ({ fillsOf, store }) =>
				AppsModule({ apps: fillsOf(AppsSlot).map(faceOf), titlesOf: titlesOfApps(fillsOf(AppsSlot)), store }),
			contract: AppsContract,
		}),
		TabPageSlot({ id: "apps", tabPage: ({ fillsOf }) => appsTabPageOf(fillsOf(AppsSlot)) }),
	);
