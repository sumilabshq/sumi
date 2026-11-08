import { runtime, orpcTransport } from "@widgetarium/data-framework";
import { fixtureBilling } from "@widgetarium/fixture-billing";

const SERVER = "http://localhost:8787";

const started = runtime()
	.imports(fixtureBilling({ over: orpcTransport(SERVER) }))
	.start();

export const charged = started.send(fixtureBilling.charge.charge, { amount: 1 });
export const balance = started.send(fixtureBilling.charge.balance);
