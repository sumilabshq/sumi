import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { hapticsPartsOn } from "./gateways/haptics-parts/haptics-parts.gateway.js";

export const haptics = module("haptics")
	.on(Server)
	.guard(AuthenticatedGuard)
	.provide((facts) => hapticsPartsOn(facts));
