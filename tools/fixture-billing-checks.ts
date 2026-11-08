import { runtime, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { fixtureBilling } from "@widgetarium/fixture-billing";
import { fixtureBilling as RunnableFixtureBillingModule } from "../packages/domain/fixture-billing/module.ts";
import { MemoryLedgerGateway } from "../packages/domain/fixture-billing/gateways/ledger/memory.gateway.ts";
import { check } from "./check-helpers.ts";

const SERVER_URL = "http://fixture-billing.test";

const ledger = new MemoryLedgerGateway("USD");
const served = dataFrameworkMiddleware(
	runtime()
		.modules(RunnableFixtureBillingModule({ injects: { ledger } }))
		.start({ platform: "server", env: {} }),
);
const client = runtime()
	.imports(fixtureBilling({ over: orpcTransport(SERVER_URL, { fetch: served.fetch }) }))
	.start();

const first = await client.send(fixtureBilling.charge.charge, { amount: 10 });
const second = await client.send(fixtureBilling.charge.charge, { amount: 15 });
check("a charge adds its amount to the total and counts one charge, and names the query it invalidated", second, {
	ok: true,
	output: {
		currency: "USD",
		total: 25,
		charges: 2,
	},
	invalidated: [
		{
			query: "fixture-billing.charge.balance",
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
check("the balance query reads what the ledger holds", await client.send(fixtureBilling.charge.balance), {
	ok: true,
	output: ledger.balance(),
});
const refused = await client.send(fixtureBilling.charge.charge, { amount: 1001 });
check("a charge over the limit is refused and saves nothing", [refused.ok, ledger.balance().total], [false, 25]);
