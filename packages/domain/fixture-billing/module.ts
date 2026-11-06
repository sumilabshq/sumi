import { PublicGuard, Server, module } from "@widgetarium/framework";
import { fixtureBillingPartsOn } from "./gateways/fixture-billing-parts/fixture-billing-parts.gateway.js";
import { BalanceQuery, ChargeCommand } from "./features/charge/requests.js";

export const FixtureBillingModule = module("fixture-billing")
	.on(Server)
	.public(BalanceQuery, ChargeCommand)
	.guard(PublicGuard)
	.provide((facts) => fixtureBillingPartsOn(facts));
