import { handler, serverModule } from "@widgetarium/core/requests";
import { BalanceQuery } from "@widgetarium/fixture-billing";

const UnguardedServerModule = serverModule("fixture-billing");

export const BalanceQueryHandler = handler(BalanceQuery, UnguardedServerModule).handle(() => ({
	currency: "EUR",
	total: 0,
	charges: 0,
}));
