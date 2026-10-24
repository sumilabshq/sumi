import type { Balance } from "../../shared/schema/balance.schema.js";

export abstract class LedgerGateway {
	abstract balance(): Balance;
	abstract saveBalance(balance: Balance, reason: string): void;
}
