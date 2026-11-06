import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { appsPartsOn } from "./gateways/apps-parts/apps-parts.gateway.js";
import type { AppsConfig } from "./shared/host/apps.host.js";
import { AppsQuery } from "./features/apps/requests.js";

export type { AppsConfig } from "./shared/host/apps.host.js";

export const AppsModule = module("apps")
	.on(Anywhere)
	.config<AppsConfig>()
	.public(AppsQuery)
	.guard(PublicGuard)
	.provide((facts) => appsPartsOn(facts));
