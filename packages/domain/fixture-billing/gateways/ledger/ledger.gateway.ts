import type { Balance } from "../../shared/schema/balance.schema.js";

export abstract class LedgerGateway {
	abstract add(amount: number): Promise<Balance>;
	abstract balance(): Promise<Balance>;
}
