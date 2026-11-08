import { runtime, localTransport, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { fixtureBilling } from "@widgetarium/fixture-billing/contract";
import { fixtureBilling as RunnableFixtureBillingModule } from "../packages/domain/fixture-billing/generated/module.ts";
import { MemoryLedgerGateway } from "../packages/domain/fixture-billing/gateways/ledger/memory.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";

interface Heard {
	readonly client: Runtime;
	readonly balanceChanges: { count: number };
}

function clientOver(transport: RemoteTransport): Heard {
	const client = runtime()
		.imports(fixtureBilling({ over: transport }))
		.start();
	const balanceChanges = { count: 0 };
	client.routes.watch(fixtureBilling.charge.balance, undefined, () => {
		balanceChanges.count += 1;
	});
	return { client, balanceChanges };
}

const overLocal = localTransport();
const notYet = await runtime()
	.imports(fixtureBilling({ over: overLocal }))
	.start()
	.send(fixtureBilling.charge.balance);
check(
	"a local transport no server listens on yet answers unreachable, never throws",
	notYet.ok ? "answered" : notYet.code,
	"unreachable",
);

const localServer = runtime()
	.modules(RunnableFixtureBillingModule({ injects: { ledger: new MemoryLedgerGateway("USD") } }))
	.start({ platform: "server", env: {} });
const stopServingLocal = overLocal.serve(localServer);
const localCharger = clientOver(overLocal);
const localWatcher = clientOver(overLocal);
const charged = await localCharger.client.send(fixtureBilling.charge.take, { amount: 7 });
check("a command crosses a local transport to the server that listens on it", charged.ok, true);
check(
	"and the other client of the same server hears the change it did not cause",
	await waitFor(() => localWatcher.balanceChanges.count > 0),
	true,
);
stopServingLocal();
localServer.stop();
const afterStop = await localCharger.client.send(fixtureBilling.charge.balance);
check(
	"a stopped adapter leaves its local transport unreachable",
	afterStop.ok ? "answered" : afterStop.code,
	"unreachable",
);

const httpServer = dataFrameworkMiddleware(
	runtime()
		.modules(RunnableFixtureBillingModule({ injects: { ledger: new MemoryLedgerGateway("USD") } }))
		.start({ platform: "server", env: {} }),
);
const overHttp = (): RemoteTransport => orpcTransport("http://billing.test", { fetch: httpServer.fetch });
const httpCharger = clientOver(overHttp());
const httpWatcher = clientOver(overHttp());
await new Promise((settled) => setTimeout(settled, 50));
await httpCharger.client.send(fixtureBilling.charge.take, { amount: 3 });
check(
	"over oRPC the other client hears the change through the changes stream",
	await waitFor(() => httpWatcher.balanceChanges.count > 0),
	true,
);
httpCharger.client.stop();
httpWatcher.client.stop();
localCharger.client.stop();
localWatcher.client.stop();
