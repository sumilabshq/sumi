import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places";
import { appsPartsOn } from "./gateways/apps-parts/apps-parts.gateway.js";
import type { AppsConfig } from "./shared/host/apps.host.js";
import { handled } from "./generated/handled.js";

export type { AppsConfig } from "./shared/host/apps.host.js";

export const apps = module()
	.on(Anywhere)
	.imports(places)
	.config<AppsConfig>()
	.guard(PublicGuard)
	.provide((facts) => appsPartsOn(facts))
	.handles(handled);
