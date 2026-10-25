import { app, orpcTransport } from "@widgetarium/core/requests";
import { BalanceQuery, ChargeCommand, FixtureBillingModule } from "@widgetarium/fixture-billing";

const SERVER = "http://localhost:8787";

const started = app()
	.imports(FixtureBillingModule.over(orpcTransport(SERVER)))
	.start();

export const charged = started.send(ChargeCommand, { amount: 1 });
export const balance = started.send(BalanceQuery);
