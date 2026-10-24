import { PublicGuard, deny, guard, handler } from "@widgetarium/core/requests";
import { LedgerGateway } from "../../gateways/ledger/ledger.gateway.js";
import { FixtureBillingServerModule } from "../../module.js";
import type { ChargeInput } from "../../shared/schema/balance.schema.js";
import { BalanceQuery, ChargeCommand } from "./contract.js";

export const CHARGE_LIMIT = 1000;

const OVER_LIMIT = "a charge is at most {limit}";

export const WithinLimitGuard = guard<ChargeInput>().handle(({ input }) => {
	if (input.amount > CHARGE_LIMIT) deny(OVER_LIMIT.replace("{limit}", String(CHARGE_LIMIT)));
});

export const ChargeCommandHandler = handler(ChargeCommand, FixtureBillingServerModule)
	.guard(PublicGuard)
	.guard(WithinLimitGuard)
	.inject({ ledgerGateway: LedgerGateway })
	.handle(({ amount }, { ledgerGateway }) => ledgerGateway.add(amount));

export const BalanceQueryHandler = handler(BalanceQuery, FixtureBillingServerModule)
	.guard(PublicGuard)
	.inject({ ledgerGateway: LedgerGateway })
	.handle((_input, { ledgerGateway }) => ledgerGateway.balance());
