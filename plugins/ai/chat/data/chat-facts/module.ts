import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { keptPlacesParts } from "@widgetarium/navigation/lib/gateways/places-parts/places-parts.gateway";
import type { PlacesConfig } from "@widgetarium/navigation/lib/shared/host/places.host";
import { StudioCallersGuard } from "./features/turns/requests.js";

export type { PlacesConfig } from "@widgetarium/navigation/lib/shared/host/places.host";

export const chatFacts = module("chat-facts")
	.on(Server)
	.config<PlacesConfig>()
	.guard(PublicGuard)
	.guard(StudioCallersGuard)
	.provide(({ scope, config }) => keptPlacesParts(config, scope.workspaceId));
