import { PublicGuard, deny, guard, handler } from "@widgetarium/core/requests";
import { Ledger } from "../../adapters/ledger/ledger.adapter.js";
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
	.inject({ ledger: Ledger })
	.handle(({ amount }, { ledger }) => ledger.add(amount));

export const BalanceQueryHandler = handler(BalanceQuery, FixtureBillingServerModule)
	.guard(PublicGuard)
	.inject({ ledger: Ledger })
	.handle((_input, { ledger }) => ledger.balance());
