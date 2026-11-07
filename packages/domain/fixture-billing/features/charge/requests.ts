import { PerCall, deny, guard } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { BalanceSchema, ChargeInputSchema } from "../../shared/schema/balance.schema.js";
import type { Balance, ChargeInput } from "../../shared/schema/balance.schema.js";

const CHARGE_LIMIT = 1000;

const OVER_LIMIT = "a charge is at most {limit}";

export const WithinLimitGuard = guard<ChargeInput>().handle(({ input }) => {
	if (input.amount > CHARGE_LIMIT) {
		deny(OVER_LIMIT.replace("{limit}", String(CHARGE_LIMIT)));
	}
});

export const BalanceQuery = query("balance")
	.public()
	.output(BalanceSchema)
	.handle((_input, { ledger }) => ledger.balance());

export const ChargeCommand = command("charge")
	.public()
	.input(ChargeInputSchema)
	.output(BalanceSchema)
	.idempotencyKey(PerCall)
	.guard(WithinLimitGuard)
	.handle(({ amount }, { ledger, invalidate }) => {
		invalidate(BalanceQuery);
		const was = ledger.balance();
		const now = balanceAfterCharge(was, amount);
		const reason = `ledger total ${was.total} → ${now.total}, charges ${was.charges} → ${now.charges} (charge ${amount})`;
		ledger.saveBalance(now, reason);
		console.info(`[widgetarium] ${reason}`);
		return now;
	});

function balanceAfterCharge(balance: Balance, amount: number): Balance {
	return {
		...balance,
		total: balance.total + amount,
		charges: balance.charges + 1,
	};
}
