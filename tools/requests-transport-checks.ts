import { app, localTransport, orpcTransport } from "../packages/shared/core/src/requests/index.ts";
import type { RemoteTransport, StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { BalanceQuery, ChargeCommand, FixtureBillingModule } from "@widgetarium/fixture-billing";
import { FixtureBillingModule as RunnableFixtureBillingModule } from "../packages/domain/fixture-billing/module.ts";
import { MemoryLedgerGateway } from "../packages/domain/fixture-billing/gateways/ledger/memory.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";

interface Heard {
	readonly client: StartedApp;
	readonly balanceChanges: { count: number };
}

function clientOver(transport: RemoteTransport): Heard {
	const client = app().imports(FixtureBillingModule.over(transport)).start();
	const balanceChanges = { count: 0 };
	client.routes.watch(BalanceQuery, undefined, () => {
		balanceChanges.count += 1;
	});
	return { client, balanceChanges };
}

const overLocal = localTransport();
const notYet = await app().imports(FixtureBillingModule.over(overLocal)).start().send(BalanceQuery);
check(
	"a local transport no server listens on yet answers unreachable, never throws",
	notYet.ok ? "answered" : notYet.code,
	"unreachable",
);

const localServer = server()
	.modules(RunnableFixtureBillingModule.with({ ledger: new MemoryLedgerGateway("USD") }))
	.listen(overLocal)
	.start({ env: {} });
const localCharger = clientOver(overLocal);
const localWatcher = clientOver(overLocal);
const charged = await localCharger.client.send(ChargeCommand, { amount: 7 });
check("a command crosses a local transport to the server that listens on it", charged.ok, true);
check(
	"and the other client of the same server hears the change it did not cause",
	await waitFor(() => localWatcher.balanceChanges.count > 0),
	true,
);
localServer.stop();
const afterStop = await localCharger.client.send(BalanceQuery);
check(
	"a stopped server leaves its local transport unreachable",
	afterStop.ok ? "answered" : afterStop.code,
	"unreachable",
);

const httpServer = server()
	.modules(RunnableFixtureBillingModule.with({ ledger: new MemoryLedgerGateway("USD") }))
	.start({ env: {} });
const overHttp = (): RemoteTransport => orpcTransport("http://billing.test", { fetch: httpServer.fetch });
const httpCharger = clientOver(overHttp());
const httpWatcher = clientOver(overHttp());
await new Promise((settled) => setTimeout(settled, 50));
await httpCharger.client.send(ChargeCommand, { amount: 3 });
check(
	"over oRPC the other client hears the change through the changes stream",
	await waitFor(() => httpWatcher.balanceChanges.count > 0),
	true,
);
httpCharger.client.stop();
httpWatcher.client.stop();
localCharger.client.stop();
localWatcher.client.stop();
