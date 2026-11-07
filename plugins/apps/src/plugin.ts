import { AppsModule as AppsContract } from "@sumi/apps";
import { AppsModule } from "@sumi/apps/module";
import { BackgroundModulesSlot, SumiHostPlugin, TabPageSlot } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { appsTabPageOf } from "./apps-tab-page.js";
import { AppsSlot } from "./slots.js";
import { faceOf } from "./face-of.js";

export const AppsPlugin = plugin("apps")
	.require(SumiHostPlugin)
	.declare(AppsSlot)
	.fill(
		BackgroundModulesSlot({
			id: "apps",
			module: ({ fillsOf }) => AppsModule({ apps: fillsOf(AppsSlot).map(faceOf) }),
			contract: AppsContract,
		}),
		TabPageSlot({ id: "apps", tabPage: ({ fillsOf }) => appsTabPageOf(fillsOf(AppsSlot)) }),
	);
