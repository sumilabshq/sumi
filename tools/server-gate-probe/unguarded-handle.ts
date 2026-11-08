import { handler, serverModule } from "@widgetarium/data-framework";
import { fixtureBilling } from "@widgetarium/fixture-billing";

const UnguardedServerModule = serverModule("fixture-billing");

export const BalanceQueryHandler = handler(fixtureBilling.charge.balance, UnguardedServerModule).handle(() => ({
	currency: "EUR",
	total: 0,
	charges: 0,
}));
