import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { fixtureBillingPartsOn } from "./gateways/fixture-billing-parts/fixture-billing-parts.gateway.js";
import { handled } from "./generated/handled.js";

export const fixtureBilling = module()
	.on(Server)
	.guard(PublicGuard)
	.provide((facts) => fixtureBillingPartsOn(facts))
	.handles(handled);
