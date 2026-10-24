import { app } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { BalanceQuery, ChargeCommand, FixtureBillingModule } from "@widgetarium/fixture-billing";
import { FixtureBillingModule as RunnableFixtureBillingModule } from "../packages/domain/fixture-billing/module.ts";
import { MemoryLedgerGateway } from "../packages/domain/fixture-billing/gateways/ledger/memory.gateway.ts";
import { check } from "./check-helpers.ts";

const SERVER_URL = "http://fixture-billing.test";

const ledger = new MemoryLedgerGateway("USD");
const served = server().modules(RunnableFixtureBillingModule.with({ ledger })).start({ env: {} });
const client = app()
	.imports(FixtureBillingModule.at(SERVER_URL))
	.start({ host: { fetch: served.fetch } });

const first = await client.send(ChargeCommand, { amount: 10 });
const second = await client.send(ChargeCommand, { amount: 15 });
check("a charge adds its amount to the total and counts one charge, and names the query it invalidated", second, {
	ok: true,
	output: {
		currency: "USD",
		total: 25,
		charges: 2,
	},
	invalidated: [
		{
			query: "fixture-billing/balance",
			inputKey: null,
		},
	],
});
check("the first charge answered the balance it saved", first.ok ? first.output.total : first.reason, 10);
check("the handler saved what it answered through the ledger gateway", ledger.balance(), {
	currency: "USD",
	total: 25,
	charges: 2,
});
check("the balance query reads what the ledger holds", await client.send(BalanceQuery), {
	ok: true,
	output: ledger.balance(),
});
const refused = await client.send(ChargeCommand, { amount: 1001 });
check("a charge over the limit is refused and saves nothing", [refused.ok, ledger.balance().total], [false, 25]);
