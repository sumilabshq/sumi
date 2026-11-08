import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places/contract";
import { appsPartsOn } from "./gateways/apps-parts/apps-parts.gateway.js";
import type { AppsConfig } from "./shared/host/apps.host.js";

export type { AppsConfig } from "./shared/host/apps.host.js";

export const apps = module("apps")
	.on(Anywhere)
	.imports(places)
	.config<AppsConfig>()
	.guard(PublicGuard)
	.provide((facts) => appsPartsOn(facts));
