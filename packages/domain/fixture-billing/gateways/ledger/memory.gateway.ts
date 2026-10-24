import type { Balance } from "../../shared/schema/balance.schema.js";
import { LedgerGateway } from "./ledger.gateway.js";

export class MemoryLedgerGateway extends LedgerGateway {
	private held: Balance;

	constructor(currency: string) {
		super();
		this.held = { currency, total: 0, charges: 0 };
	}

	override add(amount: number): Promise<Balance> {
		this.held = { ...this.held, total: this.held.total + amount, charges: this.held.charges + 1 };
		return this.balance();
	}

	override balance(): Promise<Balance> {
		return Promise.resolve(this.held);
	}
}
