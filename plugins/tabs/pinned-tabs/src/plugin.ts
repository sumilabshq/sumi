import { pins as pinsContract } from "@sumi/pins/contract";
import { pins as pinsModule } from "@sumi/pins/implementation";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";

export const pinnedTabs = plugin("pinned-tabs")
	.require(backend)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => pinsModule({ store }), pinsContract);
	});
