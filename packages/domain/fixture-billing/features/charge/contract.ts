import { PerCall, command, query } from "@widgetarium/core/requests";
import { BalanceSchema, ChargeInputSchema } from "../../shared/schema/balance.schema.js";

export const ChargeCommand = command("fixture-billing/charge")
	.idempotencyKey(PerCall)
	.input(ChargeInputSchema)
	.output(BalanceSchema);

export const BalanceQuery = query("fixture-billing/balance").output(BalanceSchema);
