import type { Balance } from "../../shared/schema/balance.schema.js";
import { LedgerGateway } from "./ledger.gateway.js";

export class MemoryLedgerGateway extends LedgerGateway {
	private held: Balance;

	constructor(currency: string) {
		super();
		this.held = {
			currency,
			total: 0,
			charges: 0,
		};
	}

	override balance(): Balance {
		return this.held;
	}

	override saveBalance(balance: Balance): void {
		this.held = balance;
	}
}
