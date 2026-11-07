import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { keptPlacesParts } from "./gateways/places-parts/places-parts.gateway.js";
import type { PlacesConfig } from "./shared/host/places.host.js";
import { AppCallersGuard } from "./features/tab-facts/requests.js";
import { handled } from "./generated/handled.js";

export const PlacesModule = module("places")
	.on(Server)
	.config<PlacesConfig>()
	.guard(PublicGuard)
	.guard(AppCallersGuard)
	.provide(({ scope, config }) => keptPlacesParts(config.store, scope.workspaceId))
	.handles(...handled);
