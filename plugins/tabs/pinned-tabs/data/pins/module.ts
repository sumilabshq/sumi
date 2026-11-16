import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { pinsPartsOn } from "./gateways/pins-parts/pins-parts.gateway.js";
import type { PinsConfig } from "./shared/host/pins.host.js";

export type { PinsConfig } from "./shared/host/pins.host.js";

export const pins = module("pins")
	.on(Server)
	.config<PinsConfig>()
	.guard(PublicGuard)
	.provide((facts) => pinsPartsOn(facts));
