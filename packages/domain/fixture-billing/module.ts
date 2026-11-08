import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { fixtureBillingPartsOn } from "./gateways/fixture-billing-parts/fixture-billing-parts.gateway.js";

export const fixtureBilling = module("fixture-billing")
	.on(Server)
	.guard(PublicGuard)
	.provide((facts) => fixtureBillingPartsOn(facts));
