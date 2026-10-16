import { serverModule } from "@widgetarium/core/requests";
import { MemoryLedgerGateway } from "./gateways/ledger/memory.gateway.js";

const DEFAULT_CURRENCY = "EUR";

export const FixtureBillingServerModule = serverModule("fixture-billing").provide(({ env }) => ({
	ledgerGateway: new MemoryLedgerGateway(env["LEDGER_CURRENCY"] ?? DEFAULT_CURRENCY),
}));
