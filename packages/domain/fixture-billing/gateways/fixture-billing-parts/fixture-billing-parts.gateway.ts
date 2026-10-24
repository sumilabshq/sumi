import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import type { LedgerGateway } from "../ledger/ledger.gateway.js";
import { MemoryLedgerGateway } from "../ledger/memory.gateway.js";

export type FixtureBillingParts = {
	readonly ledger: LedgerGateway;
};

const DEFAULT_CURRENCY = "EUR";

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => FixtureBillingParts>> = {
	browser: memoryFixtureBillingParts,
	tauri: memoryFixtureBillingParts,
	server: memoryFixtureBillingParts,
};

export function fixtureBillingPartsOn(facts: ModuleFacts): FixtureBillingParts {
	return PARTS_ON[facts.platform](facts);
}

function memoryFixtureBillingParts({ env }: ModuleFacts): FixtureBillingParts {
	return {
		ledger: new MemoryLedgerGateway(env["LEDGER_CURRENCY"] ?? DEFAULT_CURRENCY),
	};
}
