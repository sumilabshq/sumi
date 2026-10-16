import { serverModule } from "@widgetarium/core/requests";
import { MemoryLedger } from "./adapters/ledger/memory.adapter.js";

const DEFAULT_CURRENCY = "EUR";

export const FixtureBillingServerModule = serverModule("fixture-billing").provide(({ env }) => ({
	ledger: new MemoryLedger(env["LEDGER_CURRENCY"] ?? DEFAULT_CURRENCY),
}));
