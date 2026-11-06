import { AppsModule as AppsContract } from "@sumi/apps";
import { AppsModule } from "@sumi/apps/module";
import { BackgroundModulesSlot, SumiHostPlugin, TabPageSlot } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { appsTabPageOf } from "./apps-tab-page.js";
import { AppsSlot } from "./slots.js";
import { withoutView } from "./without-view.js";

export const AppsPlugin = plugin("apps")
	.require(SumiHostPlugin)
	.declare(AppsSlot)
	.fill(
		BackgroundModulesSlot({
			id: "apps",
			module: ({ fillsOf }) => AppsModule({ apps: fillsOf(AppsSlot).map(withoutView) }),
			contract: AppsContract,
		}),
		TabPageSlot({ tabPage: ({ fillsOf }) => appsTabPageOf(fillsOf(AppsSlot)) }),
	);
