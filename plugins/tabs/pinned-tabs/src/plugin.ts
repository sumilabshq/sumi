import { pins as pinsContract } from "@sumi/pins/contract";
import { pins as pinsModule } from "@sumi/pins/implementation";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };

export const pinnedTabs = plugin("pinned-tabs")
	.describe(metadata)
	.require(backend)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => pinsModule({ store }), pinsContract);
	});
