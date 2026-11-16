import { pins as pinsContract } from "@sumi/pins/contract";
import { pins as pinsModule } from "@sumi/pins/implementation";
import { backend } from "@sumi/sumi-host-plugin";
import { tabStrip } from "@sumi/tab-strip-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PinMenuItem } from "./features/pinned-tabs/ui/pin-menu-item/pin-menu-item.js";
import { PinnedEnd } from "./features/pinned-tabs/ui/pinned-end/pinned-end.js";
import { PinnedTabs } from "./features/pinned-tabs/ui/pinned-tabs/pinned-tabs.js";

export const pinnedTabs = plugin("pinned-tabs")
	.require(backend, tabStrip)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => pinsModule({ store }), pinsContract);
		app.use(tabStrip).slots.leading.add(PinnedTabs);
		app.use(tabStrip).slots.tabEnd.replace(PinnedEnd);
		app.use(tabStrip).slots.tabMenuItems.add(PinMenuItem);
	});
