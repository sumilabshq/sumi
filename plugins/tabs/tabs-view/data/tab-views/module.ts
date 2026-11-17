import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { viewsPartsOn } from "./gateways/views-parts/views-parts.gateway.js";
import type { TabViewsConfig } from "./shared/host/tab-views.host.js";

export type { TabViewsConfig } from "./shared/host/tab-views.host.js";

export const tabViews = module("tab-views")
	.on(Server)
	.config<TabViewsConfig>()
	.guard(PublicGuard)
	.provide((facts) => viewsPartsOn(facts));
