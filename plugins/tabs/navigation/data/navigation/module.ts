import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { keptPlacesParts } from "./gateways/places-parts/places-parts.gateway.js";
import type { PlacesConfig } from "./shared/host/places.host.js";
import { AppCallersGuard } from "./features/tab-facts/requests.js";

export type { AppAbilities, PlacedApp, PlacesConfig } from "./shared/host/places.host.js";

export const navigation = module("navigation")
	.on(Server)
	.config<PlacesConfig>()
	.guard(PublicGuard)
	.guard(AppCallersGuard)
	.provide(({ scope, config }) => keptPlacesParts(config, scope.workspaceId));
